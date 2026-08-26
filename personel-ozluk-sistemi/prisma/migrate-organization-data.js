const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/*
 * HR PLANET
 * Eski organizasyon yapisini yeni dinamik OrganizationUnit yapisina tasir.
 *
 * Eski tablolar SILINMEZ.
 * Mevcut kodlar KORUNUR.
 * Pozisyonlar yeni organizationUnitId alanina baglanir.
 * OrganizationUnitSequence mevcut en yuksek organizasyon kodundan devam eder.
 *
 * Calistirma:
 *   node prisma/migrate-organization-data.js
 */

const UNIT_TYPES = [
  {
    code: 'GENERAL_MANAGEMENT',
    name: 'Genel Mudurluk',
    levelOrder: 10,
  },
  {
    code: 'DIRECTORATE',
    name: 'Direktorluk',
    levelOrder: 20,
  },
  {
    code: 'MANAGEMENT',
    name: 'Mudurluk',
    levelOrder: 30,
  },
  {
    code: 'DEPARTMENT',
    name: 'Bolum',
    levelOrder: 40,
  },
];

function numericCode(value) {
  const text = String(value || '').trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const number = Number(text);

  if (!Number.isSafeInteger(number)) {
    return null;
  }

  return number;
}

async function ensureUnitTypes(tx, companyId) {
  const result = {};

  for (const item of UNIT_TYPES) {
    const type = await tx.organizationUnitType.upsert({
      where: {
        companyId_code: {
          companyId,
          code: item.code,
        },
      },
      update: {
        name: item.name,
        levelOrder: item.levelOrder,
        isActive: true,
      },
      create: {
        companyId,
        code: item.code,
        name: item.name,
        levelOrder: item.levelOrder,
        isActive: true,
      },
    });

    result[item.code] = type;
  }

  return result;
}

async function upsertUnit(
  tx,
  {
    companyId,
    typeId,
    code,
    name,
    description,
    isActive,
    parentUnitId,
  }
) {
  return tx.organizationUnit.upsert({
    where: {
      companyId_code: {
        companyId,
        code,
      },
    },
    update: {
      typeId,
      name,
      description: description || null,
      isActive: isActive !== false,
      parentUnitId: parentUnitId || null,
    },
    create: {
      companyId,
      typeId,
      code,
      name,
      description: description || null,
      isActive: isActive !== false,
      parentUnitId: parentUnitId || null,
    },
  });
}

async function migrateCompany(company) {
  console.log('');
  console.log('====================================================');
  console.log(`Sirket: ${company.companyCode} - ${company.name}`);
  console.log(`ID    : ${company.id}`);
  console.log('====================================================');

  const before = {
    generalManagement:
      await prisma.generalManagement.count({
        where: { companyId: company.id },
      }),

    directorates:
      await prisma.directorate.count({
        where: { companyId: company.id },
      }),

    managements:
      await prisma.management.count({
        where: { companyId: company.id },
      }),

    departments:
      await prisma.organizationDepartment.count({
        where: { companyId: company.id },
      }),

    positions:
      await prisma.position.count({
        where: { companyId: company.id },
      }),

    organizationUnits:
      await prisma.organizationUnit.count({
        where: { companyId: company.id },
      }),
  };

  console.log('');
  console.log('Mevcut kayitlar:');
  console.table(before);

  const result = await prisma.$transaction(
    async (tx) => {
      const types =
        await ensureUnitTypes(
          tx,
          company.id
        );

      /*
       * Eski ID -> yeni OrganizationUnit ID mapleri.
       */
      const generalManagementMap =
        new Map();

      const directorateMap =
        new Map();

      const managementMap =
        new Map();

      const departmentMap =
        new Map();

      /*
       * Manager pozisyonlarini unit create sirasinda vermiyoruz.
       * Once tum unitler olussun, sonra tek tek bagliyoruz.
       */
      const managerAssignments = [];

      // ------------------------------------------------------
      // 1) GENEL MUDURLUK
      // ------------------------------------------------------

      const generalManagements =
        await tx.generalManagement.findMany({
          where: {
            companyId: company.id,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

      for (
        const legacy
        of generalManagements
      ) {
        const unit =
          await upsertUnit(
            tx,
            {
              companyId:
                company.id,

              typeId:
                types
                  .GENERAL_MANAGEMENT
                  .id,

              code:
                legacy.code,

              name:
                legacy.name,

              description:
                legacy.description,

              isActive:
                legacy.isActive,

              parentUnitId:
                null,
            }
          );

        generalManagementMap.set(
          legacy.id,
          unit.id
        );

        if (
          legacy.managerPositionId
        ) {
          managerAssignments.push({
            unitId:
              unit.id,

            positionId:
              legacy.managerPositionId,

            label:
              `${legacy.code} - ${legacy.name}`,
          });
        }
      }

      /*
       * Mevcut modelde Directorate -> GeneralManagement FK'si yok.
       * Bu nedenle sirketin tek Genel Mudurluk kaydi varsa
       * direktorlukleri otomatik onun altina bagliyoruz.
       */
      const rootGeneralUnitId =
        generalManagements.length === 1
          ? generalManagementMap.get(
              generalManagements[0].id
            )
          : null;

      // ------------------------------------------------------
      // 2) DIREKTORLUK
      // ------------------------------------------------------

      const directorates =
        await tx.directorate.findMany({
          where: {
            companyId: company.id,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

      for (
        const legacy
        of directorates
      ) {
        const unit =
          await upsertUnit(
            tx,
            {
              companyId:
                company.id,

              typeId:
                types
                  .DIRECTORATE
                  .id,

              code:
                legacy.code,

              name:
                legacy.name,

              description:
                legacy.description,

              isActive:
                legacy.isActive,

              parentUnitId:
                rootGeneralUnitId,
            }
          );

        directorateMap.set(
          legacy.id,
          unit.id
        );

        if (
          legacy.managerPositionId
        ) {
          managerAssignments.push({
            unitId:
              unit.id,

            positionId:
              legacy.managerPositionId,

            label:
              `${legacy.code} - ${legacy.name}`,
          });
        }
      }

      // ------------------------------------------------------
      // 3) MUDURLUK
      // ------------------------------------------------------

      const managements =
        await tx.management.findMany({
          where: {
            companyId: company.id,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

      for (
        const legacy
        of managements
      ) {
        const parentUnitId =
          directorateMap.get(
            legacy.directorateId
          );

        if (!parentUnitId) {
          throw new Error(
            `Mudurluk ust direktorlugu bulunamadi: ${legacy.code} - ${legacy.name} / directorateId=${legacy.directorateId}`
          );
        }

        const unit =
          await upsertUnit(
            tx,
            {
              companyId:
                company.id,

              typeId:
                types
                  .MANAGEMENT
                  .id,

              code:
                legacy.code,

              name:
                legacy.name,

              description:
                legacy.description,

              isActive:
                legacy.isActive,

              parentUnitId,
            }
          );

        managementMap.set(
          legacy.id,
          unit.id
        );

        if (
          legacy.managerPositionId
        ) {
          managerAssignments.push({
            unitId:
              unit.id,

            positionId:
              legacy.managerPositionId,

            label:
              `${legacy.code} - ${legacy.name}`,
          });
        }
      }

      // ------------------------------------------------------
      // 4) BOLUM
      // ------------------------------------------------------

      const departments =
        await tx.organizationDepartment.findMany({
          where: {
            companyId: company.id,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

      for (
        const legacy
        of departments
      ) {
        const parentUnitId =
          managementMap.get(
            legacy.managementId
          );

        if (!parentUnitId) {
          throw new Error(
            `Bolum ust mudurlugu bulunamadi: ${legacy.code} - ${legacy.name} / managementId=${legacy.managementId}`
          );
        }

        const unit =
          await upsertUnit(
            tx,
            {
              companyId:
                company.id,

              typeId:
                types
                  .DEPARTMENT
                  .id,

              code:
                legacy.code,

              name:
                legacy.name,

              description:
                legacy.description,

              isActive:
                legacy.isActive,

              parentUnitId,
            }
          );

        departmentMap.set(
          legacy.id,
          unit.id
        );

        if (
          legacy.managerPositionId
        ) {
          managerAssignments.push({
            unitId:
              unit.id,

            positionId:
              legacy.managerPositionId,

            label:
              `${legacy.code} - ${legacy.name}`,
          });
        }
      }

      // ------------------------------------------------------
      // 5) POZISYON -> ORGANIZATION UNIT BAGLANTISI
      // ------------------------------------------------------

      const positions =
        await tx.position.findMany({
          where: {
            companyId:
              company.id,
          },

          select: {
            id:
              true,

            positionCode:
              true,

            name:
              true,

            organizationLevel:
              true,

            generalManagementId:
              true,

            directorateId:
              true,

            managementId:
              true,

            organizationDepartmentId:
              true,

            organizationUnitId:
              true,
          },
        });

      let linkedPositionCount =
        0;

      const unlinkedPositions =
        [];

      for (
        const position
        of positions
      ) {
        let organizationUnitId =
          null;

        if (
          position.organizationLevel ===
          'GENERAL_MANAGEMENT'
        ) {
          organizationUnitId =
            generalManagementMap.get(
              position.generalManagementId
            ) ||
            null;
        }

        else if (
          position.organizationLevel ===
          'DIRECTORATE'
        ) {
          organizationUnitId =
            directorateMap.get(
              position.directorateId
            ) ||
            null;
        }

        else if (
          position.organizationLevel ===
          'MANAGEMENT'
        ) {
          organizationUnitId =
            managementMap.get(
              position.managementId
            ) ||
            null;
        }

        else if (
          position.organizationLevel ===
          'DEPARTMENT'
        ) {
          organizationUnitId =
            departmentMap.get(
              position.organizationDepartmentId
            ) ||
            null;
        }

        /*
         * Pozisyon zaten yeni sisteme bagliysa,
         * tekrar ayni degeri yazmak zarar vermez.
         */
        if (
          organizationUnitId
        ) {
          await tx.position.update({
            where: {
              id:
                position.id,
            },

            data: {
              organizationUnitId,
            },
          });

          linkedPositionCount +=
            1;
        }
        else {
          unlinkedPositions.push({
            id:
              position.id,

            positionCode:
              position.positionCode,

            name:
              position.name,

            organizationLevel:
              position.organizationLevel,
          });
        }
      }

      // ------------------------------------------------------
      // 6) ORGANIZATION UNIT MANAGER POSITION
      // ------------------------------------------------------

      const usedManagerPositions =
        new Map();

      const skippedManagerAssignments =
        [];

      for (
        const assignment
        of managerAssignments
      ) {
        const duplicate =
          usedManagerPositions.get(
            assignment.positionId
          );

        if (duplicate) {
          skippedManagerAssignments.push({
            ...assignment,
            reason:
              `Ayni pozisyon zaten ${duplicate} biriminde yonetici olarak kullanildi.`,
          });

          continue;
        }

        const position =
          await tx.position.findFirst({
            where: {
              id:
                assignment.positionId,

              companyId:
                company.id,
            },

            select: {
              id:
                true,

              organizationUnitId:
                true,

              positionCode:
                true,

              name:
                true,
            },
          });

        if (!position) {
          skippedManagerAssignments.push({
            ...assignment,
            reason:
              'Yonetici pozisyonu bulunamadi.',
          });

          continue;
        }

        /*
         * Yonetici pozisyonunun kendi birimi ile
         * yonettigi unit ayni olmali.
         */
        if (
          position.organizationUnitId !==
          assignment.unitId
        ) {
          skippedManagerAssignments.push({
            ...assignment,
            reason:
              `Yonetici pozisyonu farkli OrganizationUnit kaydina bagli. Pozisyon: ${position.positionCode} - ${position.name}`,
          });

          continue;
        }

        await tx.organizationUnit.update({
          where: {
            id:
              assignment.unitId,
          },

          data: {
            managerPositionId:
              assignment.positionId,
          },
        });

        usedManagerPositions.set(
          assignment.positionId,
          assignment.label
        );
      }

      // ------------------------------------------------------
      // 7) TEK ORGANIZASYON KOD SAYACI
      // ------------------------------------------------------

      const allUnits =
        await tx.organizationUnit.findMany({
          where: {
            companyId:
              company.id,
          },

          select: {
            code:
              true,
          },
        });

      const numericCodes =
        allUnits
          .map(
            item =>
              numericCode(
                item.code
              )
          )
          .filter(
            value =>
              value !==
              null
          );

      const maxCode =
        numericCodes.length
          ? Math.max(
              ...numericCodes
            )
          : 80000000;

      /*
       * Yeni birim kodlari 8 ile baslayan ortak seriden ilerlesin.
       * Eski en buyuk kod 80000005 ise next = 80000006.
       * En buyuk kod 700... veya 600... olsa bile en az 80000001.
       */
      const nextNumber =
        Math.max(
          80000001,
          maxCode + 1
        );

      await tx.organizationUnitSequence.upsert({
        where: {
          companyId:
            company.id,
        },

        update: {
          nextNumber,
        },

        create: {
          companyId:
            company.id,

          nextNumber,
        },
      });

      return {
        generalManagementCount:
          generalManagementMap.size,

        directorateCount:
          directorateMap.size,

        managementCount:
          managementMap.size,

        departmentCount:
          departmentMap.size,

        linkedPositionCount,

        unlinkedPositions,

        managerAssignmentCount:
          usedManagerPositions.size,

        skippedManagerAssignments,

        nextNumber,
      };
    },
    {
      maxWait:
        10000,

      timeout:
        60000,
    }
  );

  const after = {
    organizationUnitTypes:
      await prisma.organizationUnitType.count({
        where: {
          companyId:
            company.id,
        },
      }),

    organizationUnits:
      await prisma.organizationUnit.count({
        where: {
          companyId:
            company.id,
        },
      }),

    positionsLinked:
      await prisma.position.count({
        where: {
          companyId:
            company.id,

          organizationUnitId: {
            not:
              null,
          },
        },
      }),
  };

  console.log('');
  console.log('Tasima sonucu:');
  console.table({
    ...result,
    unlinkedPositions:
      result.unlinkedPositions.length,
    skippedManagerAssignments:
      result.skippedManagerAssignments.length,
  });

  console.log('');
  console.log('Yeni yapi:');
  console.table(after);

  if (
    result.unlinkedPositions.length
  ) {
    console.log('');
    console.log(
      'UYARI - OrganizationUnit baglantisi kurulamayan pozisyonlar:'
    );

    console.table(
      result.unlinkedPositions
    );
  }

  if (
    result
      .skippedManagerAssignments
      .length
  ) {
    console.log('');
    console.log(
      'UYARI - Atlanmis yonetici pozisyonu baglantilari:'
    );

    console.table(
      result
        .skippedManagerAssignments
    );
  }

  console.log('');
  console.log(
    `OrganizationUnitSequence nextNumber = ${result.nextNumber}`
  );
}

async function main() {
  console.log('');
  console.log(
    'HR PLANET - DINAMIK ORGANIZASYON VERI TASIMA'
  );

  console.log(
    'Eski organizasyon tablolari SILINMEYECEK.'
  );

  const companies =
    await prisma.company.findMany({
      orderBy: {
        createdAt:
          'asc',
      },
    });

  if (!companies.length) {
    console.log(
      'Tasima yapilacak sirket bulunamadi.'
    );

    return;
  }

  for (
    const company
    of companies
  ) {
    await migrateCompany(
      company
    );
  }

  console.log('');
  console.log(
    '===================================================='
  );

  console.log(
    'DINAMIK ORGANIZASYON VERI TASIMA TAMAMLANDI'
  );

  console.log(
    '===================================================='
  );
}

main()
  .catch(
    error => {
      console.error('');
      console.error(
        'ORGANIZASYON TASIMA HATASI'
      );

      console.error(
        error
      );

      process.exit(1);
    }
  )
  .finally(
    async () => {
      await prisma.$disconnect();
    }
  );
