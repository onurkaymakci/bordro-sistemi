const { z } = require('zod');

const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');


/* ============================================================
   HELPERS
============================================================ */

const optionalText =
  z.preprocess(
    value => {
      if (
        value === '' ||
        value === null ||
        value === undefined
      ) {
        return undefined;
      }

      return String(value).trim();
    },
    z.string().optional()
  );


const optionalNullableUuid =
  z.preprocess(
    value => {
      if (
        value === '' ||
        value === undefined
      ) {
        return undefined;
      }

      if (value === null) {
        return null;
      }

      return value;
    },
    z.string().uuid().nullable().optional()
  );


function sameId(left, right) {
  return (left || null) === (right || null);
}


/* ============================================================
   GENEL MUDURLUK
============================================================ */

async function ensureGeneralManagement(
  companyId,
  client = prisma
) {
  let item =
    await client.generalManagement.findUnique({
      where: {
        companyId,
      },
      include: {
        managerPosition: {
          include: {
            employee: true,
          },
        },
      },
    });

  if (!item) {
    item =
      await client.generalManagement.create({
        data: {
          companyId,
          code: '50000001',
          name: 'Genel Mudurluk',
          isActive: true,
        },
        include: {
          managerPosition: {
            include: {
              employee: true,
            },
          },
        },
      });
  }

  return item;
}


const generalManagementSchema =
  z.object({
    name:
      z
        .string()
        .trim()
        .min(
          2,
          'Genel Mudurluk adi en az 2 karakter olmalidir.'
        )
        .optional(),

    description:
      optionalText,

    managerPositionId:
      optionalNullableUuid,

    isActive:
      z
        .boolean()
        .optional(),
  });


async function getGeneralManagement(
  req,
  res
) {
  const item =
    await ensureGeneralManagement(
      req.companyId
    );

  res.json({
    success: true,
    data: item,
  });
}


async function updateGeneralManagement(
  req,
  res
) {
  const data =
    generalManagementSchema
      .partial()
      .parse(
        req.body
      );

  const existing =
    await ensureGeneralManagement(
      req.companyId
    );

  let managerPosition =
    null;

  if (
    data.managerPositionId
  ) {
    managerPosition =
      await validateManagerPositionForUnit(
        req.companyId,
        data.managerPositionId,
        'GENERAL_MANAGEMENT',
        existing.id
      );
  }

  const item =
    await prisma.$transaction(
      async tx => {
        if (
          data.managerPositionId !==
          undefined
        ) {
          await tx.generalManagement.update({
            where: {
              id: existing.id,
            },
            data: {
              managerPositionId:
                data.managerPositionId ||
                null,
            },
          });

          if (managerPosition) {
            await tx.position.update({
              where: {
                id: managerPosition.id,
              },
              data: {
                parentPositionId: null,
              },
            });

            await tx.position.updateMany({
              where: {
                companyId:
                  req.companyId,
                isActive:
                  true,
                organizationLevel:
                  'DIRECTORATE',
                managedDirectorate: {
                  isNot: null,
                },
                NOT: {
                  id:
                    managerPosition.id,
                },
              },
              data: {
                parentPositionId:
                  managerPosition.id,
              },
            });
          }
        }

        return tx.generalManagement.update({
          where: {
            id: existing.id,
          },
          data: {
            name:
              data.name,
            description:
              data.description,
            isActive:
              data.isActive,
          },
          include: {
            managerPosition: {
              include: {
                employee: true,
              },
            },
          },
        });
      }
    );

  res.json({
    success: true,
    data: item,
  });
}


/* ============================================================
   KOD SAYACLARI
============================================================ */

async function allocateDirectorateCode(
  tx,
  companyId
) {
  let sequence =
    await tx.directorateSequence.findUnique({
      where: {
        companyId,
      },
    });

  if (!sequence) {
    const lastItem =
      await tx.directorate.findFirst({
        where: {
          companyId,
        },
        orderBy: {
          code: 'desc',
        },
        select: {
          code: true,
        },
      });

    let nextNumber =
      80000001;

    if (
      lastItem &&
      /^\d{8}$/.test(lastItem.code)
    ) {
      const lastNumber =
        Number(lastItem.code);

      if (
        Number.isFinite(lastNumber) &&
        lastNumber >= 80000001
      ) {
        nextNumber =
          lastNumber + 1;
      }
    }

    await tx.directorateSequence.create({
      data: {
        companyId,
        nextNumber:
          nextNumber + 1,
      },
    });

    return String(nextNumber);
  }

  const numberToUse =
    sequence.nextNumber;

  await tx.directorateSequence.update({
    where: {
      companyId,
    },
    data: {
      nextNumber: {
        increment: 1,
      },
    },
  });

  return String(numberToUse);
}


async function allocateManagementCode(
  tx,
  companyId
) {
  let sequence =
    await tx.managementSequence.findUnique({
      where: {
        companyId,
      },
    });

  if (!sequence) {
    const lastItem =
      await tx.management.findFirst({
        where: {
          companyId,
        },
        orderBy: {
          code: 'desc',
        },
        select: {
          code: true,
        },
      });

    let nextNumber =
      70000001;

    if (
      lastItem &&
      /^\d{8}$/.test(lastItem.code)
    ) {
      const lastNumber =
        Number(lastItem.code);

      if (
        Number.isFinite(lastNumber) &&
        lastNumber >= 70000001
      ) {
        nextNumber =
          lastNumber + 1;
      }
    }

    await tx.managementSequence.create({
      data: {
        companyId,
        nextNumber:
          nextNumber + 1,
      },
    });

    return String(nextNumber);
  }

  const numberToUse =
    sequence.nextNumber;

  await tx.managementSequence.update({
    where: {
      companyId,
    },
    data: {
      nextNumber: {
        increment: 1,
      },
    },
  });

  return String(numberToUse);
}


async function allocateOrganizationDepartmentCode(
  tx,
  companyId
) {
  let sequence =
    await tx.organizationDepartmentSequence.findUnique({
      where: {
        companyId,
      },
    });

  if (!sequence) {
    const lastItem =
      await tx.organizationDepartment.findFirst({
        where: {
          companyId,
        },
        orderBy: {
          code: 'desc',
        },
        select: {
          code: true,
        },
      });

    let nextNumber =
      60000001;

    if (
      lastItem &&
      /^\d{8}$/.test(lastItem.code)
    ) {
      const lastNumber =
        Number(lastItem.code);

      if (
        Number.isFinite(lastNumber) &&
        lastNumber >= 60000001
      ) {
        nextNumber =
          lastNumber + 1;
      }
    }

    await tx.organizationDepartmentSequence.create({
      data: {
        companyId,
        nextNumber:
          nextNumber + 1,
      },
    });

    return String(nextNumber);
  }

  const numberToUse =
    sequence.nextNumber;

  await tx.organizationDepartmentSequence.update({
    where: {
      companyId,
    },
    data: {
      nextNumber: {
        increment: 1,
      },
    },
  });

  return String(numberToUse);
}


async function allocatePositionCode(
  tx,
  companyId
) {
  let sequence =
    await tx.positionSequence.findUnique({
      where: {
        companyId,
      },
    });

  if (!sequence) {
    const lastItem =
      await tx.position.findFirst({
        where: {
          companyId,
        },
        orderBy: {
          positionCode: 'desc',
        },
        select: {
          positionCode: true,
        },
      });

    let nextNumber =
      90000001;

    if (
      lastItem &&
      /^\d{8}$/.test(
        lastItem.positionCode
      )
    ) {
      const lastNumber =
        Number(
          lastItem.positionCode
        );

      if (
        Number.isFinite(lastNumber) &&
        lastNumber >= 90000001
      ) {
        nextNumber =
          lastNumber + 1;
      }
    }

    await tx.positionSequence.create({
      data: {
        companyId,
        nextNumber:
          nextNumber + 1,
      },
    });

    return String(nextNumber);
  }

  const numberToUse =
    sequence.nextNumber;

  await tx.positionSequence.update({
    where: {
      companyId,
    },
    data: {
      nextNumber: {
        increment: 1,
      },
    },
  });

  return String(numberToUse);
}


/* ============================================================
   SCHEMAS
============================================================ */

const directorateSchema =
  z.object({
    name:
      z
        .string()
        .trim()
        .min(
          2,
          'Direktorluk adi en az 2 karakter olmalidir.'
        ),

    description:
      optionalText,

    managerPositionId:
      optionalNullableUuid,

    isActive:
      z
        .boolean()
        .optional(),
  });


const managementSchema =
  z.object({
    directorateId:
      z
        .string()
        .uuid(
          'Gecerli bir direktorluk seciniz.'
        ),

    name:
      z
        .string()
        .trim()
        .min(
          2,
          'Mudurluk adi en az 2 karakter olmalidir.'
        ),

    description:
      optionalText,

    managerPositionId:
      optionalNullableUuid,

    isActive:
      z
        .boolean()
        .optional(),
  });


const organizationDepartmentSchema =
  z.object({
    managementId:
      z
        .string()
        .uuid(
          'Gecerli bir mudurluk seciniz.'
        ),

    name:
      z
        .string()
        .trim()
        .min(
          2,
          'Bolum adi en az 2 karakter olmalidir.'
        ),

    description:
      optionalText,

    managerPositionId:
      optionalNullableUuid,

    isActive:
      z
        .boolean()
        .optional(),
  });


const positionSchema =
  z.object({
    name:
      z
        .string()
        .trim()
        .min(
          2,
          'Pozisyon adi en az 2 karakter olmalidir.'
        ),

    organizationLevel:
      z.enum([
        'GENERAL_MANAGEMENT',
        'DIRECTORATE',
        'MANAGEMENT',
        'DEPARTMENT',
      ]),

    generalManagementId:
      optionalNullableUuid,

    directorateId:
      optionalNullableUuid,

    managementId:
      optionalNullableUuid,

    organizationDepartmentId:
      optionalNullableUuid,

    parentPositionId:
      optionalNullableUuid,

    isUnitManager:
      z
        .boolean()
        .optional(),

    costCenterId:
      optionalNullableUuid,

    workLocationId:
      optionalNullableUuid,

    normCount:
      z
        .coerce
        .number()
        .int()
        .min(
          1,
          'Norm kadro en az 1 olmalidir.'
        )
        .default(1),

    description:
      optionalText,

    isActive:
      z
        .boolean()
        .optional(),
  });


/* ============================================================
   POZISYON / ORGANIZASYON YARDIMCILARI
============================================================ */

async function resolvePositionOrganization(
  companyId,
  data,
  client = prisma
) {
  const generalManagement =
    await ensureGeneralManagement(
      companyId,
      client
    );

  if (
    data.organizationLevel ===
    'GENERAL_MANAGEMENT'
  ) {
    if (
      data.generalManagementId &&
      data.generalManagementId !==
        generalManagement.id
    ) {
      throw new ApiError(
        400,
        'Secilen Genel Mudurluk bu sirket ile uyumlu degil.'
      );
    }

    if (
      generalManagement.isActive !==
      true
    ) {
      throw new ApiError(
        400,
        'Genel Mudurluk aktif degil.'
      );
    }

    return {
      organizationLevel:
        'GENERAL_MANAGEMENT',

      generalManagementId:
        generalManagement.id,

      directorateId:
        null,

      managementId:
        null,

      organizationDepartmentId:
        null,

      generalManagement,

      directorate:
        null,

      management:
        null,

      department:
        null,
    };
  }

  if (
    data.organizationLevel ===
    'DIRECTORATE'
  ) {
    if (!data.directorateId) {
      throw new ApiError(
        400,
        'Direktorluk seviyesindeki pozisyon icin direktorluk secilmelidir.'
      );
    }

    const directorate =
      await client.directorate.findFirst({
        where: {
          id:
            data.directorateId,
          companyId,
          isActive:
            true,
        },
        include: {
          managerPosition:
            true,
        },
      });

    if (!directorate) {
      throw new ApiError(
        400,
        'Secilen direktorluk bulunamadi veya aktif degil.'
      );
    }

    return {
      organizationLevel:
        'DIRECTORATE',

      generalManagementId:
        null,

      directorateId:
        directorate.id,

      managementId:
        null,

      organizationDepartmentId:
        null,

      generalManagement,

      directorate,

      management:
        null,

      department:
        null,
    };
  }

  if (
    data.organizationLevel ===
    'MANAGEMENT'
  ) {
    if (!data.managementId) {
      throw new ApiError(
        400,
        'Mudurluk seviyesindeki pozisyon icin mudurluk secilmelidir.'
      );
    }

    const management =
      await client.management.findFirst({
        where: {
          id:
            data.managementId,
          companyId,
          isActive:
            true,
        },
        include: {
          managerPosition:
            true,

          directorate: {
            include: {
              managerPosition:
                true,
            },
          },
        },
      });

    if (
      !management ||
      !management.directorate ||
      management.directorate.isActive !==
        true
    ) {
      throw new ApiError(
        400,
        'Secilen mudurluk veya bagli direktorluk aktif degil.'
      );
    }

    return {
      organizationLevel:
        'MANAGEMENT',

      generalManagementId:
        null,

      directorateId:
        null,

      managementId:
        management.id,

      organizationDepartmentId:
        null,

      generalManagement,

      directorate:
        management.directorate,

      management,

      department:
        null,
    };
  }

  if (
    data.organizationLevel ===
    'DEPARTMENT'
  ) {
    if (
      !data
        .organizationDepartmentId
    ) {
      throw new ApiError(
        400,
        'Bolum seviyesindeki pozisyon icin bolum secilmelidir.'
      );
    }

    const department =
      await client.organizationDepartment.findFirst({
        where: {
          id:
            data
              .organizationDepartmentId,
          companyId,
          isActive:
            true,
        },
        include: {
          managerPosition:
            true,

          management: {
            include: {
              managerPosition:
                true,

              directorate: {
                include: {
                  managerPosition:
                    true,
                },
              },
            },
          },
        },
      });

    if (
      !department ||
      !department.management ||
      department.management.isActive !==
        true ||
      !department
        .management
        .directorate ||
      department
        .management
        .directorate
        .isActive !==
        true
    ) {
      throw new ApiError(
        400,
        'Secilen bolum veya organizasyon baglantisi aktif degil.'
      );
    }

    return {
      organizationLevel:
        'DEPARTMENT',

      generalManagementId:
        null,

      directorateId:
        null,

      managementId:
        null,

      organizationDepartmentId:
        department.id,

      generalManagement,

      directorate:
        department
          .management
          .directorate,

      management:
        department.management,

      department,
    };
  }

  throw new ApiError(
    400,
    'Gecerli bir organizasyon seviyesi seciniz.'
  );
}


async function validateParentPosition(
  companyId,
  parentPositionId,
  context,
  currentPositionId = null,
  client = prisma
) {
  if (!parentPositionId) {
    return null;
  }

  if (
    currentPositionId &&
    parentPositionId ===
      currentPositionId
  ) {
    throw new ApiError(
      400,
      'Bir pozisyon kendi ust pozisyonu olamaz.'
    );
  }

  const parent =
    await client.position.findFirst({
      where: {
        id:
          parentPositionId,
        companyId,
        isActive:
          true,
      },
    });

  if (!parent) {
    throw new ApiError(
      400,
      'Secilen ust pozisyon bulunamadi veya aktif degil.'
    );
  }

  let allowed =
    false;

  if (
    context.organizationLevel ===
    'GENERAL_MANAGEMENT'
  ) {
    allowed =
      parent.organizationLevel ===
        'GENERAL_MANAGEMENT' &&
      parent.generalManagementId ===
        context.generalManagement.id;
  }

  if (
    context.organizationLevel ===
    'DIRECTORATE'
  ) {
    allowed =
      (
        parent.organizationLevel ===
          'DIRECTORATE' &&
        parent.directorateId ===
          context.directorate.id
      ) ||
      (
        parent.organizationLevel ===
          'GENERAL_MANAGEMENT' &&
        parent.generalManagementId ===
          context.generalManagement.id
      );
  }

  if (
    context.organizationLevel ===
    'MANAGEMENT'
  ) {
    allowed =
      (
        parent.organizationLevel ===
          'MANAGEMENT' &&
        parent.managementId ===
          context.management.id
      ) ||
      (
        parent.organizationLevel ===
          'DIRECTORATE' &&
        parent.directorateId ===
          context.directorate.id
      ) ||
      (
        parent.organizationLevel ===
          'GENERAL_MANAGEMENT' &&
        parent.generalManagementId ===
          context.generalManagement.id
      );
  }

  if (
    context.organizationLevel ===
    'DEPARTMENT'
  ) {
    allowed =
      (
        parent.organizationLevel ===
          'DEPARTMENT' &&
        parent.organizationDepartmentId ===
          context.department.id
      ) ||
      (
        parent.organizationLevel ===
          'MANAGEMENT' &&
        parent.managementId ===
          context.management.id
      ) ||
      (
        parent.organizationLevel ===
          'DIRECTORATE' &&
        parent.directorateId ===
          context.directorate.id
      ) ||
      (
        parent.organizationLevel ===
          'GENERAL_MANAGEMENT' &&
        parent.generalManagementId ===
          context.generalManagement.id
      );
  }

  if (!allowed) {
    throw new ApiError(
      400,
      'Secilen ust pozisyon bu organizasyon zinciri ile uyumlu degil.'
    );
  }

  return parent;
}


async function ensureNoPositionCycle(
  companyId,
  currentPositionId,
  parentPositionId,
  client = prisma
) {
  if (
    !currentPositionId ||
    !parentPositionId
  ) {
    return;
  }

  let cursorId =
    parentPositionId;

  const visited =
    new Set();

  for (
    let i = 0;
    i < 100 && cursorId;
    i += 1
  ) {
    if (
      cursorId ===
      currentPositionId
    ) {
      throw new ApiError(
        400,
        'Pozisyon hiyerarsisinda dongu olusturulamaz.'
      );
    }

    if (
      visited.has(cursorId)
    ) {
      throw new ApiError(
        400,
        'Pozisyon hiyerarsisinda gecersiz dongu tespit edildi.'
      );
    }

    visited.add(cursorId);

    const item =
      await client.position.findFirst({
        where: {
          id:
            cursorId,
          companyId,
        },
        select: {
          parentPositionId:
            true,
        },
      });

    if (!item) {
      return;
    }

    cursorId =
      item.parentPositionId;
  }
}


function getUpperManagerPositionId(
  context,
  excludePositionId = null
) {
  let result =
    null;

  if (
    context.organizationLevel ===
    'GENERAL_MANAGEMENT'
  ) {
    result =
      null;
  }

  if (
    context.organizationLevel ===
    'DIRECTORATE'
  ) {
    result =
      context.generalManagement
        ?.managerPositionId ||
      null;
  }

  if (
    context.organizationLevel ===
    'MANAGEMENT'
  ) {
    result =
      context.directorate
        ?.managerPositionId ||
      context.generalManagement
        ?.managerPositionId ||
      null;
  }

  if (
    context.organizationLevel ===
    'DEPARTMENT'
  ) {
    result =
      context.management
        ?.managerPositionId ||
      context.directorate
        ?.managerPositionId ||
      context.generalManagement
        ?.managerPositionId ||
      null;
  }

  if (
    result &&
    result ===
      excludePositionId
  ) {
    return null;
  }

  return result;
}


function getDefaultParentPositionId(
  context,
  excludePositionId = null,
  isUnitManager = false
) {
  if (isUnitManager) {
    return getUpperManagerPositionId(
      context,
      excludePositionId
    );
  }

  let result =
    null;

  if (
    context.organizationLevel ===
    'GENERAL_MANAGEMENT'
  ) {
    result =
      context.generalManagement
        ?.managerPositionId ||
      null;
  }

  if (
    context.organizationLevel ===
    'DIRECTORATE'
  ) {
    result =
      context.directorate
        ?.managerPositionId ||
      context.generalManagement
        ?.managerPositionId ||
      null;
  }

  if (
    context.organizationLevel ===
    'MANAGEMENT'
  ) {
    result =
      context.management
        ?.managerPositionId ||
      context.directorate
        ?.managerPositionId ||
      context.generalManagement
        ?.managerPositionId ||
      null;
  }

  if (
    context.organizationLevel ===
    'DEPARTMENT'
  ) {
    result =
      context.department
        ?.managerPositionId ||
      context.management
        ?.managerPositionId ||
      context.directorate
        ?.managerPositionId ||
      context.generalManagement
        ?.managerPositionId ||
      null;
  }

  if (
    result &&
    result ===
      excludePositionId
  ) {
    return getUpperManagerPositionId(
      context,
      excludePositionId
    );
  }

  return result;
}


async function validateManagerPositionForUnit(
  companyId,
  positionId,
  level,
  unitId,
  client = prisma
) {
  if (!positionId) {
    return null;
  }

  const position =
    await client.position.findFirst({
      where: {
        id:
          positionId,
        companyId,
        isActive:
          true,
      },
      include: {
        managedGeneralManagement:
          true,

        managedDirectorate:
          true,

        managedManagement:
          true,

        managedDepartment:
          true,
      },
    });

  if (!position) {
    throw new ApiError(
      400,
      'Secilen yonetici pozisyonu bulunamadi veya aktif degil.'
    );
  }

  let belongsToUnit =
    false;

  if (
    level ===
    'GENERAL_MANAGEMENT'
  ) {
    belongsToUnit =
      position.organizationLevel ===
        'GENERAL_MANAGEMENT' &&
      position.generalManagementId ===
        unitId;
  }

  if (
    level ===
    'DIRECTORATE'
  ) {
    belongsToUnit =
      position.organizationLevel ===
        'DIRECTORATE' &&
      position.directorateId ===
        unitId;
  }

  if (
    level ===
    'MANAGEMENT'
  ) {
    belongsToUnit =
      position.organizationLevel ===
        'MANAGEMENT' &&
      position.managementId ===
        unitId;
  }

  if (
    level ===
    'DEPARTMENT'
  ) {
    belongsToUnit =
      position.organizationLevel ===
        'DEPARTMENT' &&
      position.organizationDepartmentId ===
        unitId;
  }

  if (!belongsToUnit) {
    throw new ApiError(
      400,
      'Yonetici pozisyonu secilen organizasyon birimine ait olmalidir.'
    );
  }

  const foreignManagerAssignment =
    (
      position.managedGeneralManagement &&
      !(
        level ===
          'GENERAL_MANAGEMENT' &&
        position.managedGeneralManagement.id ===
          unitId
      )
    ) ||
    (
      position.managedDirectorate &&
      !(
        level ===
          'DIRECTORATE' &&
        position.managedDirectorate.id ===
          unitId
      )
    ) ||
    (
      position.managedManagement &&
      !(
        level ===
          'MANAGEMENT' &&
        position.managedManagement.id ===
          unitId
      )
    ) ||
    (
      position.managedDepartment &&
      !(
        level ===
          'DEPARTMENT' &&
        position.managedDepartment.id ===
          unitId
      )
    );

  if (foreignManagerAssignment) {
    throw new ApiError(
      409,
      'Bu pozisyon baska bir organizasyon biriminin yonetici pozisyonu olarak kullaniliyor.'
    );
  }

  return position;
}


async function clearManagerAssignmentsForPosition(
  tx,
  positionId
) {
  await Promise.all([
    tx.generalManagement.updateMany({
      where: {
        managerPositionId:
          positionId,
      },
      data: {
        managerPositionId:
          null,
      },
    }),

    tx.directorate.updateMany({
      where: {
        managerPositionId:
          positionId,
      },
      data: {
        managerPositionId:
          null,
      },
    }),

    tx.management.updateMany({
      where: {
        managerPositionId:
          positionId,
      },
      data: {
        managerPositionId:
          null,
      },
    }),

    tx.organizationDepartment.updateMany({
      where: {
        managerPositionId:
          positionId,
      },
      data: {
        managerPositionId:
          null,
      },
    }),
  ]);
}


async function assignPositionAsUnitManager(
  tx,
  companyId,
  positionId,
  context
) {
  const unitId =
    context.organizationLevel ===
      'GENERAL_MANAGEMENT'
      ? context.generalManagement.id
      : context.organizationLevel ===
          'DIRECTORATE'
        ? context.directorate.id
        : context.organizationLevel ===
            'MANAGEMENT'
          ? context.management.id
          : context.department.id;

  await validateManagerPositionForUnit(
    companyId,
    positionId,
    context.organizationLevel,
    unitId,
    tx
  );

  await clearManagerAssignmentsForPosition(
    tx,
    positionId
  );

  if (
    context.organizationLevel ===
    'GENERAL_MANAGEMENT'
  ) {
    await tx.generalManagement.update({
      where: {
        id:
          context.generalManagement.id,
      },
      data: {
        managerPositionId:
          positionId,
      },
    });

    /*
     * CEO / Genel Mudur atandiginda mevcut direktorluk
     * yoneticilerini otomatik olarak kok pozisyona bagla.
     */
    const directorates =
      await tx.directorate.findMany({
        where: {
          companyId,
          isActive:
            true,
          managerPositionId: {
            not: null,
          },
        },
        select: {
          managerPositionId:
            true,
        },
      });

    const managerIds =
      directorates
        .map(
          item =>
            item.managerPositionId
        )
        .filter(Boolean);

    if (
      managerIds.length >
      0
    ) {
      await tx.position.updateMany({
        where: {
          id: {
            in:
              managerIds,
          },
          companyId,
        },
        data: {
          parentPositionId:
            positionId,
        },
      });
    }

    return;
  }

  if (
    context.organizationLevel ===
    'DIRECTORATE'
  ) {
    await tx.directorate.update({
      where: {
        id:
          context.directorate.id,
      },
      data: {
        managerPositionId:
          positionId,
      },
    });

    const managements =
      await tx.management.findMany({
        where: {
          companyId,
          directorateId:
            context.directorate.id,
          isActive:
            true,
          managerPositionId: {
            not: null,
          },
        },
        select: {
          managerPositionId:
            true,
        },
      });

    const managerIds =
      managements
        .map(
          item =>
            item.managerPositionId
        )
        .filter(Boolean);

    if (
      managerIds.length >
      0
    ) {
      await tx.position.updateMany({
        where: {
          id: {
            in:
              managerIds,
          },
          companyId,
        },
        data: {
          parentPositionId:
            positionId,
        },
      });
    }

    return;
  }

  if (
    context.organizationLevel ===
    'MANAGEMENT'
  ) {
    await tx.management.update({
      where: {
        id:
          context.management.id,
      },
      data: {
        managerPositionId:
          positionId,
      },
    });

    const departments =
      await tx.organizationDepartment.findMany({
        where: {
          companyId,
          managementId:
            context.management.id,
          isActive:
            true,
          managerPositionId: {
            not: null,
          },
        },
        select: {
          managerPositionId:
            true,
        },
      });

    const managerIds =
      departments
        .map(
          item =>
            item.managerPositionId
        )
        .filter(Boolean);

    if (
      managerIds.length >
      0
    ) {
      await tx.position.updateMany({
        where: {
          id: {
            in:
              managerIds,
          },
          companyId,
        },
        data: {
          parentPositionId:
            positionId,
        },
      });
    }

    return;
  }

  await tx.organizationDepartment.update({
    where: {
      id:
        context.department.id,
    },
    data: {
      managerPositionId:
        positionId,
    },
  });
}


async function validateCostCenterAndLocation(
  companyId,
  data
) {
  if (
    data.costCenterId
  ) {
    const costCenter =
      await prisma.costCenter.findFirst({
        where: {
          id:
            data.costCenterId,
          companyId,
          isActive:
            true,
        },
      });

    if (!costCenter) {
      throw new ApiError(
        400,
        'Secilen masraf yeri bulunamadi veya aktif degil.'
      );
    }
  }

  if (
    data.workLocationId
  ) {
    const workLocation =
      await prisma.workLocation.findFirst({
        where: {
          id:
            data.workLocationId,
          companyId,
          isActive:
            true,
        },
      });

    if (!workLocation) {
      throw new ApiError(
        400,
        'Secilen calisma lokasyonu bulunamadi veya aktif degil.'
      );
    }
  }
}


/* ============================================================
   DIREKTORLUK LISTELE
============================================================ */

async function listDirectorates(
  req,
  res
) {
  const {
    search,
    activeOnly = 'false',
  } = req.query;

  const items =
    await prisma.directorate.findMany({
      where: {
        companyId:
          req.companyId,

        ...(activeOnly === 'true'
          ? {
              isActive:
                true,
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
                {
                  code: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        managerPosition: {
          select: {
            id: true,
            positionCode: true,
            name: true,
            isActive: true,
            employee: {
              select: {
                id: true,
                registryNo: true,
                fullName: true,
              },
            },
          },
        },

        _count: {
          select: {
            managements:
              true,
            positions:
              true,
          },
        },
      },

      orderBy: [
        {
          isActive:
            'desc',
        },
        {
          name:
            'asc',
        },
      ],
    });

  res.json({
    success:
      true,
    data:
      items,
  });
}


/* ============================================================
   DIREKTORLUK DETAY
============================================================ */

async function getDirectorateById(
  req,
  res
) {
  const item =
    await prisma.directorate.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        managerPosition: {
          include: {
            employee:
              true,
          },
        },

        managements: {
          include: {
            managerPosition:
              true,
          },
          orderBy: {
            name:
              'asc',
          },
        },

        positions: {
          orderBy: {
            positionCode:
              'asc',
          },
        },
      },
    });

  if (!item) {
    throw new ApiError(
      404,
      'Direktorluk bulunamadi.'
    );
  }

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   DIREKTORLUK OLUSTUR
============================================================ */

async function createDirectorate(
  req,
  res
) {
  const data =
    directorateSchema.parse(
      req.body
    );

  await ensureGeneralManagement(
    req.companyId
  );

  const duplicate =
    await prisma.directorate.findFirst({
      where: {
        companyId:
          req.companyId,
        name:
          data.name,
      },
    });

  if (duplicate) {
    throw new ApiError(
      409,
      'Ayni isimde bir direktorluk daha once tanimlanmis.'
    );
  }

  if (
    data.managerPositionId
  ) {
    throw new ApiError(
      400,
      'Yeni direktorluk olusturulurken yonetici pozisyonu secilemez. Once direktorlugu, sonra pozisyonu olusturup yonetici olarak atayin.'
    );
  }

  const item =
    await prisma.$transaction(
      async tx => {
        const code =
          await allocateDirectorateCode(
            tx,
            req.companyId
          );

        return tx.directorate.create({
          data: {
            companyId:
              req.companyId,
            code,
            name:
              data.name,
            description:
              data.description,
            isActive:
              data.isActive ??
              true,
          },
        });
      }
    );

  res
    .status(201)
    .json({
      success:
        true,
      data:
        item,
    });
}


/* ============================================================
   DIREKTORLUK GUNCELLE
============================================================ */

async function updateDirectorate(
  req,
  res
) {
  const data =
    directorateSchema
      .partial()
      .parse(
        req.body
      );

  const existing =
    await prisma.directorate.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Direktorluk bulunamadi.'
    );
  }

  if (data.name) {
    const duplicate =
      await prisma.directorate.findFirst({
        where: {
          companyId:
            req.companyId,
          name:
            data.name,
          NOT: {
            id:
              existing.id,
          },
        },
      });

    if (duplicate) {
      throw new ApiError(
        409,
        'Ayni direktorluk adi baska bir kayitta kullaniliyor.'
      );
    }
  }

  let managerPosition =
    null;

  if (
    data.managerPositionId
  ) {
    managerPosition =
      await validateManagerPositionForUnit(
        req.companyId,
        data.managerPositionId,
        'DIRECTORATE',
        existing.id
      );
  }

  const root =
    await ensureGeneralManagement(
      req.companyId
    );

  const item =
    await prisma.$transaction(
      async tx => {
        if (
          data.managerPositionId !==
          undefined
        ) {
          await tx.directorate.update({
            where: {
              id:
                existing.id,
            },
            data: {
              managerPositionId:
                data.managerPositionId ||
                null,
            },
          });

          if (managerPosition) {
            await tx.position.update({
              where: {
                id:
                  managerPosition.id,
              },
              data: {
                parentPositionId:
                  root.managerPositionId ||
                  null,
              },
            });

            const managements =
              await tx.management.findMany({
                where: {
                  companyId:
                    req.companyId,
                  directorateId:
                    existing.id,
                  isActive:
                    true,
                  managerPositionId: {
                    not: null,
                  },
                },
                select: {
                  managerPositionId:
                    true,
                },
              });

            const childManagerIds =
              managements
                .map(
                  item =>
                    item.managerPositionId
                )
                .filter(Boolean);

            if (
              childManagerIds.length >
              0
            ) {
              await tx.position.updateMany({
                where: {
                  companyId:
                    req.companyId,
                  id: {
                    in:
                      childManagerIds,
                  },
                },
                data: {
                  parentPositionId:
                    managerPosition.id,
                },
              });
            }
          }
        }

        return tx.directorate.update({
          where: {
            id:
              existing.id,
          },
          data: {
            name:
              data.name,
            description:
              data.description,
            isActive:
              data.isActive,
          },
          include: {
            managerPosition:
              true,
          },
        });
      }
    );

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   DIREKTORLUK PASIFE AL
============================================================ */

async function deactivateDirectorate(
  req,
  res
) {
  const existing =
    await prisma.directorate.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        managements: {
          where: {
            isActive:
              true,
          },
          select: {
            id: true,
          },
        },

        positions: {
          where: {
            isActive:
              true,
          },
          select: {
            id: true,
          },
        },
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Direktorluk bulunamadi.'
    );
  }

  if (
    existing.managements.length >
    0
  ) {
    throw new ApiError(
      400,
      'Bu direktorluge bagli aktif mudurlukler bulunuyor. Once alt mudurlukleri pasife almalisiniz.'
    );
  }

  if (
    existing.positions.length >
    0
  ) {
    throw new ApiError(
      400,
      'Bu direktorluge bagli aktif pozisyonlar bulunuyor. Once pozisyonlari pasife almalisiniz.'
    );
  }

  const item =
    await prisma.directorate.update({
      where: {
        id:
          existing.id,
      },
      data: {
        managerPositionId:
          null,
        isActive:
          false,
      },
    });

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   MUDURLUK LISTELE
============================================================ */

async function listManagements(
  req,
  res
) {
  const {
    search,
    directorateId,
    activeOnly = 'false',
  } = req.query;

  const items =
    await prisma.management.findMany({
      where: {
        companyId:
          req.companyId,

        ...(directorateId && {
          directorateId,
        }),

        ...(activeOnly === 'true'
          ? {
              isActive:
                true,
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
                {
                  code: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        directorate: {
          select: {
            id: true,
            code: true,
            name: true,
            managerPositionId: true,
            managerPosition: {
              select: {
                id: true,
                positionCode: true,
                name: true,
              },
            },
          },
        },

        managerPosition: {
          select: {
            id: true,
            positionCode: true,
            name: true,
            isActive: true,
            employee: {
              select: {
                id: true,
                registryNo: true,
                fullName: true,
              },
            },
          },
        },

        _count: {
          select: {
            departments:
              true,
            positions:
              true,
          },
        },
      },

      orderBy: [
        {
          isActive:
            'desc',
        },
        {
          name:
            'asc',
        },
      ],
    });

  res.json({
    success:
      true,
    data:
      items,
  });
}


/* ============================================================
   MUDURLUK DETAY
============================================================ */

async function getManagementById(
  req,
  res
) {
  const item =
    await prisma.management.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        directorate: {
          include: {
            managerPosition:
              true,
          },
        },

        managerPosition: {
          include: {
            employee:
              true,
          },
        },

        departments: {
          include: {
            managerPosition:
              true,
          },
          orderBy: {
            name:
              'asc',
          },
        },

        positions: {
          orderBy: {
            positionCode:
              'asc',
          },
        },
      },
    });

  if (!item) {
    throw new ApiError(
      404,
      'Mudurluk bulunamadi.'
    );
  }

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   MUDURLUK OLUSTUR
============================================================ */

async function createManagement(
  req,
  res
) {
  const data =
    managementSchema.parse(
      req.body
    );

  const directorate =
    await prisma.directorate.findFirst({
      where: {
        id:
          data.directorateId,
        companyId:
          req.companyId,
        isActive:
          true,
      },
    });

  if (!directorate) {
    throw new ApiError(
      400,
      'Secilen direktorluk bulunamadi veya aktif degil.'
    );
  }

  const duplicate =
    await prisma.management.findFirst({
      where: {
        companyId:
          req.companyId,
        directorateId:
          data.directorateId,
        name:
          data.name,
      },
    });

  if (duplicate) {
    throw new ApiError(
      409,
      'Bu direktorluk altinda ayni isimde bir mudurluk zaten tanimli.'
    );
  }

  if (
    data.managerPositionId
  ) {
    throw new ApiError(
      400,
      'Yeni mudurluk olusturulurken yonetici pozisyonu secilemez. Once mudurlugu, sonra pozisyonu olusturup yonetici olarak atayin.'
    );
  }

  const item =
    await prisma.$transaction(
      async tx => {
        const code =
          await allocateManagementCode(
            tx,
            req.companyId
          );

        return tx.management.create({
          data: {
            companyId:
              req.companyId,
            directorateId:
              data.directorateId,
            code,
            name:
              data.name,
            description:
              data.description,
            isActive:
              data.isActive ??
              true,
          },

          include: {
            directorate:
              true,
          },
        });
      }
    );

  res
    .status(201)
    .json({
      success:
        true,
      data:
        item,
    });
}


/* ============================================================
   MUDURLUK GUNCELLE
============================================================ */

async function updateManagement(
  req,
  res
) {
  const data =
    managementSchema
      .partial()
      .parse(
        req.body
      );

  const existing =
    await prisma.management.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },
      include: {
        managerPosition:
          true,
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Mudurluk bulunamadi.'
    );
  }

  const effectiveDirectorateId =
    data.directorateId ||
    existing.directorateId;

  const directorate =
    await prisma.directorate.findFirst({
      where: {
        id:
          effectiveDirectorateId,
        companyId:
          req.companyId,
        isActive:
          true,
      },
    });

  if (!directorate) {
    throw new ApiError(
      400,
      'Secilen direktorluk bulunamadi veya aktif degil.'
    );
  }

  if (data.name) {
    const duplicate =
      await prisma.management.findFirst({
        where: {
          companyId:
            req.companyId,
          directorateId:
            effectiveDirectorateId,
          name:
            data.name,
          NOT: {
            id:
              existing.id,
          },
        },
      });

    if (duplicate) {
      throw new ApiError(
        409,
        'Bu direktorluk altinda ayni isimde baska bir mudurluk bulunuyor.'
      );
    }
  }

  const effectiveManagerPositionId =
    data.managerPositionId ===
      undefined
      ? existing.managerPositionId
      : data.managerPositionId;

  let managerPosition =
    null;

  if (
    effectiveManagerPositionId
  ) {
    managerPosition =
      await validateManagerPositionForUnit(
        req.companyId,
        effectiveManagerPositionId,
        'MANAGEMENT',
        existing.id
      );
  }

  const root =
    await ensureGeneralManagement(
      req.companyId
    );

  const item =
    await prisma.$transaction(
      async tx => {
        const upperParentId =
          directorate.managerPositionId ||
          root.managerPositionId ||
          null;

        if (managerPosition) {
          await tx.position.update({
            where: {
              id:
                managerPosition.id,
            },
            data: {
              parentPositionId:
                upperParentId,
            },
          });

          const departments =
            await tx.organizationDepartment.findMany({
              where: {
                companyId:
                  req.companyId,
                managementId:
                  existing.id,
                isActive:
                  true,
                managerPositionId: {
                  not: null,
                },
              },
              select: {
                managerPositionId:
                  true,
              },
            });

          const childManagerIds =
            departments
              .map(
                item =>
                  item.managerPositionId
              )
              .filter(Boolean);

          if (
            childManagerIds.length >
            0
          ) {
            await tx.position.updateMany({
              where: {
                companyId:
                  req.companyId,
                id: {
                  in:
                    childManagerIds,
                },
              },
              data: {
                parentPositionId:
                  managerPosition.id,
              },
            });
          }
        }

        return tx.management.update({
          where: {
            id:
              existing.id,
          },
          data: {
            directorateId:
              data.directorateId,
            name:
              data.name,
            description:
              data.description,
            managerPositionId:
              data.managerPositionId ===
                undefined
                ? undefined
                : data.managerPositionId ||
                  null,
            isActive:
              data.isActive,
          },
          include: {
            directorate: {
              include: {
                managerPosition:
                  true,
              },
            },
            managerPosition:
              true,
          },
        });
      }
    );

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   MUDURLUK PASIFE AL
============================================================ */

async function deactivateManagement(
  req,
  res
) {
  const existing =
    await prisma.management.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        departments: {
          where: {
            isActive:
              true,
          },
          select: {
            id: true,
          },
        },

        positions: {
          where: {
            isActive:
              true,
          },
          select: {
            id: true,
          },
        },
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Mudurluk bulunamadi.'
    );
  }

  if (
    existing.departments.length >
    0
  ) {
    throw new ApiError(
      400,
      'Bu mudurluge bagli aktif bolumler bulunuyor. Once alt bolumleri pasife almalisiniz.'
    );
  }

  if (
    existing.positions.length >
    0
  ) {
    throw new ApiError(
      400,
      'Bu mudurluge bagli aktif pozisyonlar bulunuyor. Once pozisyonlari pasife almalisiniz.'
    );
  }

  const item =
    await prisma.management.update({
      where: {
        id:
          existing.id,
      },
      data: {
        managerPositionId:
          null,
        isActive:
          false,
      },
    });

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   BOLUM LISTELE
============================================================ */

async function listOrganizationDepartments(
  req,
  res
) {
  const {
    search,
    managementId,
    directorateId,
    activeOnly = 'false',
  } = req.query;

  const items =
    await prisma.organizationDepartment.findMany({
      where: {
        companyId:
          req.companyId,

        ...(managementId && {
          managementId,
        }),

        ...(directorateId
          ? {
              management: {
                directorateId,
              },
            }
          : {}),

        ...(activeOnly === 'true'
          ? {
              isActive:
                true,
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
                {
                  code: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        managerPosition: {
          select: {
            id: true,
            positionCode: true,
            name: true,
            isActive: true,
            employee: {
              select: {
                id: true,
                registryNo: true,
                fullName: true,
              },
            },
          },
        },

        management: {
          include: {
            managerPosition: {
              select: {
                id: true,
                positionCode: true,
                name: true,
              },
            },

            directorate: {
              select: {
                id: true,
                code: true,
                name: true,
                managerPositionId: true,
                managerPosition: {
                  select: {
                    id: true,
                    positionCode: true,
                    name: true,
                  },
                },
              },
            },
          },
        },

        _count: {
          select: {
            positions:
              true,
          },
        },
      },

      orderBy: [
        {
          isActive:
            'desc',
        },
        {
          name:
            'asc',
        },
      ],
    });

  res.json({
    success:
      true,
    data:
      items,
  });
}


/* ============================================================
   BOLUM DETAY
============================================================ */

async function getOrganizationDepartmentById(
  req,
  res
) {
  const item =
    await prisma.organizationDepartment.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        managerPosition: {
          include: {
            employee:
              true,
          },
        },

        management: {
          include: {
            managerPosition:
              true,

            directorate: {
              include: {
                managerPosition:
                  true,
              },
            },
          },
        },

        positions: {
          orderBy: {
            positionCode:
              'asc',
          },
        },
      },
    });

  if (!item) {
    throw new ApiError(
      404,
      'Bolum bulunamadi.'
    );
  }

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   BOLUM OLUSTUR
============================================================ */

async function createOrganizationDepartment(
  req,
  res
) {
  const data =
    organizationDepartmentSchema.parse(
      req.body
    );

  const management =
    await prisma.management.findFirst({
      where: {
        id:
          data.managementId,
        companyId:
          req.companyId,
        isActive:
          true,
      },

      include: {
        directorate:
          true,
      },
    });

  if (
    !management ||
    !management.directorate ||
    management.directorate.isActive !==
      true
  ) {
    throw new ApiError(
      400,
      'Secilen mudurluk veya bagli direktorluk aktif degil.'
    );
  }

  const duplicate =
    await prisma.organizationDepartment.findFirst({
      where: {
        companyId:
          req.companyId,
        managementId:
          data.managementId,
        name:
          data.name,
      },
    });

  if (duplicate) {
    throw new ApiError(
      409,
      'Bu mudurluk altinda ayni isimde bir bolum zaten tanimli.'
    );
  }

  if (
    data.managerPositionId
  ) {
    throw new ApiError(
      400,
      'Yeni bolum olusturulurken yonetici pozisyonu secilemez. Once bolumu, sonra pozisyonu olusturup yonetici olarak atayin.'
    );
  }

  const item =
    await prisma.$transaction(
      async tx => {
        const code =
          await allocateOrganizationDepartmentCode(
            tx,
            req.companyId
          );

        return tx.organizationDepartment.create({
          data: {
            companyId:
              req.companyId,
            managementId:
              data.managementId,
            code,
            name:
              data.name,
            description:
              data.description,
            isActive:
              data.isActive ??
              true,
          },

          include: {
            management: {
              include: {
                directorate:
                  true,
              },
            },
          },
        });
      }
    );

  res
    .status(201)
    .json({
      success:
        true,
      data:
        item,
    });
}


/* ============================================================
   BOLUM GUNCELLE
============================================================ */

async function updateOrganizationDepartment(
  req,
  res
) {
  const data =
    organizationDepartmentSchema
      .partial()
      .parse(
        req.body
      );

  const existing =
    await prisma.organizationDepartment.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },
      include: {
        managerPosition:
          true,
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Bolum bulunamadi.'
    );
  }

  const effectiveManagementId =
    data.managementId ||
    existing.managementId;

  const management =
    await prisma.management.findFirst({
      where: {
        id:
          effectiveManagementId,
        companyId:
          req.companyId,
        isActive:
          true,
      },

      include: {
        directorate:
          true,
      },
    });

  if (
    !management ||
    !management.directorate ||
    management.directorate.isActive !==
      true
  ) {
    throw new ApiError(
      400,
      'Secilen mudurluk veya bagli direktorluk aktif degil.'
    );
  }

  if (data.name) {
    const duplicate =
      await prisma.organizationDepartment.findFirst({
        where: {
          companyId:
            req.companyId,
          managementId:
            effectiveManagementId,
          name:
            data.name,
          NOT: {
            id:
              existing.id,
          },
        },
      });

    if (duplicate) {
      throw new ApiError(
        409,
        'Bu mudurluk altinda ayni isimde baska bir bolum bulunuyor.'
      );
    }
  }

  const effectiveManagerPositionId =
    data.managerPositionId ===
      undefined
      ? existing.managerPositionId
      : data.managerPositionId;

  let managerPosition =
    null;

  if (
    effectiveManagerPositionId
  ) {
    managerPosition =
      await validateManagerPositionForUnit(
        req.companyId,
        effectiveManagerPositionId,
        'DEPARTMENT',
        existing.id
      );
  }

  const root =
    await ensureGeneralManagement(
      req.companyId
    );

  const item =
    await prisma.$transaction(
      async tx => {
        const upperParentId =
          management.managerPositionId ||
          management.directorate
            .managerPositionId ||
          root.managerPositionId ||
          null;

        if (managerPosition) {
          await tx.position.update({
            where: {
              id:
                managerPosition.id,
            },
            data: {
              parentPositionId:
                upperParentId,
            },
          });
        }

        return tx.organizationDepartment.update({
          where: {
            id:
              existing.id,
          },
          data: {
            managementId:
              data.managementId,
            name:
              data.name,
            description:
              data.description,
            managerPositionId:
              data.managerPositionId ===
                undefined
                ? undefined
                : data.managerPositionId ||
                  null,
            isActive:
              data.isActive,
          },
          include: {
            managerPosition:
              true,
            management: {
              include: {
                managerPosition:
                  true,
                directorate: {
                  include: {
                    managerPosition:
                      true,
                  },
                },
              },
            },
          },
        });
      }
    );

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   BOLUM PASIFE AL
============================================================ */

async function deactivateOrganizationDepartment(
  req,
  res
) {
  const existing =
    await prisma.organizationDepartment.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        positions: {
          where: {
            isActive:
              true,
          },
          select: {
            id: true,
          },
        },
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Bolum bulunamadi.'
    );
  }

  if (
    existing.positions.length >
    0
  ) {
    throw new ApiError(
      400,
      'Bu bolume bagli aktif pozisyonlar bulunuyor. Once alt pozisyonlari pasife almalisiniz.'
    );
  }

  const item =
    await prisma.organizationDepartment.update({
      where: {
        id:
          existing.id,
      },
      data: {
        managerPositionId:
          null,
        isActive:
          false,
      },
    });

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   POZISYON LISTELE
============================================================ */

async function listPositions(
  req,
  res
) {
  const {
    search,
    organizationLevel,
    generalManagementId,
    organizationDepartmentId,
    managementId,
    directorateId,
    activeOnly = 'false',
  } = req.query;

  const items =
    await prisma.position.findMany({
      where: {
        companyId:
          req.companyId,

        ...(organizationLevel && {
          organizationLevel,
        }),

        ...(generalManagementId && {
          generalManagementId,
        }),

        ...(organizationDepartmentId && {
          organizationDepartmentId,
        }),

        ...(managementId && {
          OR: [
            {
              managementId,
            },
            {
              organizationDepartment: {
                managementId,
              },
            },
          ],
        }),

        ...(directorateId && {
          OR: [
            {
              directorateId,
            },
            {
              management: {
                directorateId,
              },
            },
            {
              organizationDepartment: {
                management: {
                  directorateId,
                },
              },
            },
          ],
        }),

        ...(activeOnly === 'true'
          ? {
              isActive:
                true,
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
                {
                  positionCode: {
                    contains:
                      search,
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        generalManagement: {
          select: {
            id: true,
            code: true,
            name: true,
            managerPositionId: true,
          },
        },

        directorate: {
          select: {
            id: true,
            code: true,
            name: true,
            managerPositionId: true,
          },
        },

        management: {
          include: {
            directorate: {
              select: {
                id: true,
                code: true,
                name: true,
                managerPositionId: true,
              },
            },
          },
        },

        organizationDepartment: {
          include: {
            management: {
              include: {
                directorate: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    managerPositionId: true,
                  },
                },
              },
            },
          },
        },

        parentPosition: {
          select: {
            id: true,
            positionCode: true,
            name: true,
            organizationLevel: true,
          },
        },

        managedGeneralManagement: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },

        managedDirectorate: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },

        managedManagement: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },

        managedDepartment: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },

        costCenter:
          true,

        workLocation:
          true,

        employee: {
          select: {
            id: true,
            registryNo: true,
            fullName: true,
            status: true,
          },
        },

        _count: {
          select: {
            childPositions:
              true,
          },
        },
      },

      orderBy: [
        {
          positionCode:
            'asc',
        },
      ],
    });

  const data =
    items.map(
      item => ({
        ...item,

        isUnitManager:
          Boolean(
            item.managedGeneralManagement ||
            item.managedDirectorate ||
            item.managedManagement ||
            item.managedDepartment
          ),

        managedUnit:
          item.managedGeneralManagement
            ? {
                level:
                  'GENERAL_MANAGEMENT',
                ...item.managedGeneralManagement,
              }
            : item.managedDirectorate
              ? {
                  level:
                    'DIRECTORATE',
                  ...item.managedDirectorate,
                }
              : item.managedManagement
                ? {
                    level:
                      'MANAGEMENT',
                    ...item.managedManagement,
                  }
                : item.managedDepartment
                  ? {
                      level:
                        'DEPARTMENT',
                      ...item.managedDepartment,
                    }
                  : null,
      })
    );

  res.json({
    success:
      true,
    data,
  });
}


/* ============================================================
   POZISYON DETAY
============================================================ */

async function getPositionById(
  req,
  res
) {
  const item =
    await prisma.position.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        generalManagement:
          true,

        directorate:
          true,

        management: {
          include: {
            directorate:
              true,
          },
        },

        organizationDepartment: {
          include: {
            management: {
              include: {
                directorate:
                  true,
              },
            },
          },
        },

        parentPosition:
          true,

        childPositions: {
          orderBy: {
            positionCode:
              'asc',
          },
        },

        managedGeneralManagement:
          true,

        managedDirectorate:
          true,

        managedManagement:
          true,

        managedDepartment:
          true,

        costCenter:
          true,

        workLocation:
          true,

        employee:
          true,
      },
    });

  if (!item) {
    throw new ApiError(
      404,
      'Pozisyon bulunamadi.'
    );
  }

  res.json({
    success:
      true,
    data: {
      ...item,
      isUnitManager:
        Boolean(
          item.managedGeneralManagement ||
          item.managedDirectorate ||
          item.managedManagement ||
          item.managedDepartment
        ),
    },
  });
}


/* ============================================================
   POZISYON OLUSTUR
============================================================ */

async function createPosition(
  req,
  res
) {
  const data =
    positionSchema.parse(
      req.body
    );

  const context =
    await resolvePositionOrganization(
      req.companyId,
      data
    );

  await validateCostCenterAndLocation(
    req.companyId,
    data
  );

  const duplicate =
    await prisma.position.findFirst({
      where: {
        companyId:
          req.companyId,

        organizationLevel:
          context.organizationLevel,

        generalManagementId:
          context.generalManagementId,

        directorateId:
          context.directorateId,

        managementId:
          context.managementId,

        organizationDepartmentId:
          context.organizationDepartmentId,

        name:
          data.name,
      },
    });

  if (duplicate) {
    throw new ApiError(
      409,
      'Bu organizasyon seviyesinde ayni adla bir pozisyon zaten tanimli.'
    );
  }

  let parentPositionId =
    null;

  if (
    data.isUnitManager ===
    true
  ) {
    parentPositionId =
      getUpperManagerPositionId(
        context
      );
  }
  else if (
    data.parentPositionId
  ) {
    await validateParentPosition(
      req.companyId,
      data.parentPositionId,
      context
    );

    parentPositionId =
      data.parentPositionId;
  }
  else {
    parentPositionId =
      getDefaultParentPositionId(
        context
      );
  }

  if (parentPositionId) {
    await validateParentPosition(
      req.companyId,
      parentPositionId,
      context
    );
  }

  const item =
    await prisma.$transaction(
      async tx => {
        const positionCode =
          await allocatePositionCode(
            tx,
            req.companyId
          );

        const created =
          await tx.position.create({
            data: {
              companyId:
                req.companyId,

              positionCode,

              name:
                data.name,

              organizationLevel:
                context.organizationLevel,

              generalManagementId:
                context.generalManagementId,

              directorateId:
                context.directorateId,

              managementId:
                context.managementId,

              organizationDepartmentId:
                context.organizationDepartmentId,

              parentPositionId,

              costCenterId:
                data.costCenterId ||
                null,

              workLocationId:
                data.workLocationId ||
                null,

              normCount:
                data.normCount,

              description:
                data.description,

              isActive:
                data.isActive ??
                true,
            },
          });

        if (
          data.isUnitManager ===
          true
        ) {
          await assignPositionAsUnitManager(
            tx,
            req.companyId,
            created.id,
            context
          );
        }

        return tx.position.findUnique({
          where: {
            id:
              created.id,
          },

          include: {
            generalManagement:
              true,

            directorate:
              true,

            management: {
              include: {
                directorate:
                  true,
              },
            },

            organizationDepartment: {
              include: {
                management: {
                  include: {
                    directorate:
                      true,
                  },
                },
              },
            },

            parentPosition:
              true,

            managedGeneralManagement:
              true,

            managedDirectorate:
              true,

            managedManagement:
              true,

            managedDepartment:
              true,

            costCenter:
              true,

            workLocation:
              true,
          },
        });
      }
    );

  res
    .status(201)
    .json({
      success:
        true,
      data: {
        ...item,
        isUnitManager:
          Boolean(
            item.managedGeneralManagement ||
            item.managedDirectorate ||
            item.managedManagement ||
            item.managedDepartment
          ),
      },
    });
}


/* ============================================================
   POZISYON GUNCELLE
============================================================ */

async function updatePosition(
  req,
  res
) {
  const data =
    positionSchema
      .partial()
      .parse(
        req.body
      );

  const existing =
    await prisma.position.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        employee: {
          select: {
            id: true,
            registryNo: true,
          },
        },

        managedGeneralManagement:
          true,

        managedDirectorate:
          true,

        managedManagement:
          true,

        managedDepartment:
          true,
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Pozisyon bulunamadi.'
    );
  }

  const effectiveData = {
    organizationLevel:
      data.organizationLevel ??
      existing.organizationLevel,

    generalManagementId:
      data.generalManagementId !==
        undefined
        ? data.generalManagementId
        : existing.generalManagementId,

    directorateId:
      data.directorateId !==
        undefined
        ? data.directorateId
        : existing.directorateId,

    managementId:
      data.managementId !==
        undefined
        ? data.managementId
        : existing.managementId,

    organizationDepartmentId:
      data.organizationDepartmentId !==
        undefined
        ? data.organizationDepartmentId
        : existing.organizationDepartmentId,
  };

  const context =
    await resolvePositionOrganization(
      req.companyId,
      effectiveData
    );

  const organizationChanged =
    existing.organizationLevel !==
      context.organizationLevel ||
    !sameId(
      existing.generalManagementId,
      context.generalManagementId
    ) ||
    !sameId(
      existing.directorateId,
      context.directorateId
    ) ||
    !sameId(
      existing.managementId,
      context.managementId
    ) ||
    !sameId(
      existing.organizationDepartmentId,
      context.organizationDepartmentId
    );

  const currentlyUnitManager =
    Boolean(
      existing.managedGeneralManagement ||
      existing.managedDirectorate ||
      existing.managedManagement ||
      existing.managedDepartment
    );

  if (
    organizationChanged &&
    currentlyUnitManager &&
    data.isUnitManager !==
      false
  ) {
    throw new ApiError(
      400,
      'Bu pozisyon bir organizasyon biriminin yoneticisidir. Pozisyonu tasimadan once Birim Yoneticisi atamasini kaldirin.'
    );
  }

  await validateCostCenterAndLocation(
    req.companyId,
    data
  );

  const positionName =
    data.name ??
    existing.name;

  const duplicate =
    await prisma.position.findFirst({
      where: {
        companyId:
          req.companyId,

        organizationLevel:
          context.organizationLevel,

        generalManagementId:
          context.generalManagementId,

        directorateId:
          context.directorateId,

        managementId:
          context.managementId,

        organizationDepartmentId:
          context.organizationDepartmentId,

        name:
          positionName,

        NOT: {
          id:
            existing.id,
        },
      },
    });

  if (duplicate) {
    throw new ApiError(
      409,
      'Bu organizasyon seviyesinde ayni adla baska bir pozisyon bulunuyor.'
    );
  }

  const effectiveIsUnitManager =
    data.isUnitManager ===
      undefined
      ? currentlyUnitManager
      : data.isUnitManager;

  let parentPositionId =
    existing.parentPositionId;

  if (
    effectiveIsUnitManager
  ) {
    parentPositionId =
      getUpperManagerPositionId(
        context,
        existing.id
      );
  }
  else if (
    data.parentPositionId !==
    undefined
  ) {
    if (
      data.parentPositionId
    ) {
      await validateParentPosition(
        req.companyId,
        data.parentPositionId,
        context,
        existing.id
      );

      await ensureNoPositionCycle(
        req.companyId,
        existing.id,
        data.parentPositionId
      );

      parentPositionId =
        data.parentPositionId;
    }
    else {
      parentPositionId =
        getDefaultParentPositionId(
          context,
          existing.id,
          false
        );
    }
  }
  else if (
    organizationChanged ||
    (
      currentlyUnitManager &&
      data.isUnitManager ===
        false
    )
  ) {
    parentPositionId =
      getDefaultParentPositionId(
        context,
        existing.id,
        false
      );
  }

  if (parentPositionId) {
    await validateParentPosition(
      req.companyId,
      parentPositionId,
      context,
      existing.id
    );

    await ensureNoPositionCycle(
      req.companyId,
      existing.id,
      parentPositionId
    );
  }

  const item =
    await prisma.$transaction(
      async tx => {
        if (
          data.isUnitManager ===
          false
        ) {
          await clearManagerAssignmentsForPosition(
            tx,
            existing.id
          );
        }

        const updated =
          await tx.position.update({
            where: {
              id:
                existing.id,
            },

            data: {
              name:
                data.name,

              organizationLevel:
                context.organizationLevel,

              generalManagementId:
                context.generalManagementId,

              directorateId:
                context.directorateId,

              managementId:
                context.managementId,

              organizationDepartmentId:
                context.organizationDepartmentId,

              parentPositionId,

              costCenterId:
                data.costCenterId ===
                  undefined
                  ? undefined
                  : data.costCenterId ||
                    null,

              workLocationId:
                data.workLocationId ===
                  undefined
                  ? undefined
                  : data.workLocationId ||
                    null,

              normCount:
                data.normCount,

              description:
                data.description,

              isActive:
                data.isActive,
            },
          });

        if (
          data.isUnitManager ===
          true
        ) {
          await assignPositionAsUnitManager(
            tx,
            req.companyId,
            updated.id,
            context
          );
        }

        return tx.position.findUnique({
          where: {
            id:
              updated.id,
          },

          include: {
            generalManagement:
              true,

            directorate:
              true,

            management: {
              include: {
                directorate:
                  true,
              },
            },

            organizationDepartment: {
              include: {
                management: {
                  include: {
                    directorate:
                      true,
                  },
                },
              },
            },

            parentPosition:
              true,

            managedGeneralManagement:
              true,

            managedDirectorate:
              true,

            managedManagement:
              true,

            managedDepartment:
              true,

            costCenter:
              true,

            workLocation:
              true,

            employee: {
              select: {
                id: true,
                registryNo: true,
                fullName: true,
              },
            },
          },
        });
      }
    );

  res.json({
    success:
      true,

    data: {
      ...item,

      isUnitManager:
        Boolean(
          item.managedGeneralManagement ||
          item.managedDirectorate ||
          item.managedManagement ||
          item.managedDepartment
        ),
    },
  });
}


/* ============================================================
   POZISYON PASIFE AL
============================================================ */

async function deactivatePosition(
  req,
  res
) {
  const existing =
    await prisma.position.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        childPositions: {
          where: {
            isActive:
              true,
          },
          select: {
            id: true,
          },
        },

        employee: {
          select: {
            id: true,
            registryNo: true,
            fullName: true,
          },
        },

        managedGeneralManagement:
          true,

        managedDirectorate:
          true,

        managedManagement:
          true,

        managedDepartment:
          true,
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Pozisyon bulunamadi.'
    );
  }

  if (
    existing.managedGeneralManagement ||
    existing.managedDirectorate ||
    existing.managedManagement ||
    existing.managedDepartment
  ) {
    throw new ApiError(
      400,
      'Bu pozisyon bir organizasyon biriminin yonetici pozisyonudur. Once ilgili birimde yeni yonetici pozisyonu atayin veya yonetici atamasini kaldirin.'
    );
  }

  if (
    existing.childPositions.length >
    0
  ) {
    throw new ApiError(
      400,
      'Bu pozisyona bagli aktif alt pozisyonlar bulunuyor. Once alt pozisyonlari baska bir ust pozisyona baglamalisiniz.'
    );
  }

  if (
    existing.employee
  ) {
    throw new ApiError(
      400,
      `Bu pozisyon ${existing.employee.registryNo} - ${existing.employee.fullName} personeline atanmis. Once personel atamasini kaldirmalisiniz.`
    );
  }

  const item =
    await prisma.position.update({
      where: {
        id:
          existing.id,
      },
      data: {
        isActive:
          false,
      },
    });

  res.json({
    success:
      true,
    data:
      item,
  });
}



/* ============================================================
   DINAMIK ORGANIZASYON - YARDIMCILAR
============================================================ */

const organizationUnitTypeCreateSchema =
  z.object({
    code:
      z
        .string()
        .trim()
        .min(
          2,
          'Birim tipi kodu en az 2 karakter olmalidir.'
        )
        .max(
          50,
          'Birim tipi kodu en fazla 50 karakter olabilir.'
        )
        .transform(
          value =>
            value
              .toLocaleUpperCase(
                'tr-TR'
              )
              .replaceAll(
                'İ',
                'I'
              )
              .replaceAll(
                'Ş',
                'S'
              )
              .replaceAll(
                'Ğ',
                'G'
              )
              .replaceAll(
                'Ü',
                'U'
              )
              .replaceAll(
                'Ö',
                'O'
              )
              .replaceAll(
                'Ç',
                'C'
              )
              .replace(
                /[^A-Z0-9]+/g,
                '_'
              )
              .replace(
                /^_+|_+$/g,
                ''
              )
        ),

    name:
      z
        .string()
        .trim()
        .min(
          2,
          'Birim tipi adi en az 2 karakter olmalidir.'
        )
        .max(
          100,
          'Birim tipi adi en fazla 100 karakter olabilir.'
        ),

    levelOrder:
      z
        .coerce
        .number()
        .int()
        .min(0)
        .max(9999)
        .default(0),

    isActive:
      z
        .boolean()
        .optional(),
  });


const organizationUnitTypeUpdateSchema =
  organizationUnitTypeCreateSchema
    .partial();


const organizationUnitCreateSchema =
  z.object({
    typeId:
      z
        .string()
        .uuid(),

    name:
      z
        .string()
        .trim()
        .min(
          2,
          'Organizasyon birimi adi en az 2 karakter olmalidir.'
        )
        .max(
          200,
          'Organizasyon birimi adi en fazla 200 karakter olabilir.'
        ),

    parentUnitId:
      optionalNullableUuid,

    managerPositionId:
      optionalNullableUuid,

    description:
      optionalText,

    sortOrder:
      z
        .coerce
        .number()
        .int()
        .min(0)
        .max(999999)
        .default(0),

    isActive:
      z
        .boolean()
        .optional(),
  });


const organizationUnitUpdateSchema =
  organizationUnitCreateSchema
    .partial();


async function allocateOrganizationUnitCode(
  companyId,
  tx
) {
  const sequence =
    await tx.organizationUnitSequence.upsert({
      where: {
        companyId,
      },

      update: {
        nextNumber: {
          increment:
            1,
        },
      },

      create: {
        companyId,
        nextNumber:
          80000002,
      },

      select: {
        nextNumber:
          true,
      },
    });

  /*
   * update senaryosunda increment sonrasi deger gelir.
   * create senaryosunda ilk kullanilacak kod 80000001'dir.
   */
  const allocatedNumber =
    sequence.nextNumber ===
      80000002
      ? 80000001
      : sequence.nextNumber -
        1;

  return String(
    allocatedNumber
  ).padStart(
    8,
    '0'
  );
}


async function validateOrganizationUnitType(
  companyId,
  typeId,
  client = prisma
) {
  const type =
    await client.organizationUnitType.findFirst({
      where: {
        id:
          typeId,
        companyId,
        isActive:
          true,
      },
    });

  if (!type) {
    throw new ApiError(
      400,
      'Secilen organizasyon birimi tipi bulunamadi veya aktif degil.'
    );
  }

  return type;
}


async function validateOrganizationParent(
  companyId,
  parentUnitId,
  currentUnitId = null,
  client = prisma
) {
  if (!parentUnitId) {
    return null;
  }

  if (
    currentUnitId &&
    parentUnitId ===
      currentUnitId
  ) {
    throw new ApiError(
      400,
      'Bir organizasyon birimi kendi ust birimi olamaz.'
    );
  }

  const parent =
    await client.organizationUnit.findFirst({
      where: {
        id:
          parentUnitId,
        companyId,
        isActive:
          true,
      },
    });

  if (!parent) {
    throw new ApiError(
      400,
      'Secilen ust organizasyon birimi bulunamadi veya aktif degil.'
    );
  }

  /*
   * Update sirasinda dongusel baglantiyi engelle.
   * A -> B -> C iken A'nin ustu C yapilamaz.
   */
  if (currentUnitId) {
    let cursor =
      parent;

    const visited =
      new Set();

    while (
      cursor &&
      cursor.parentUnitId
    ) {
      if (
        cursor.parentUnitId ===
        currentUnitId
      ) {
        throw new ApiError(
          400,
          'Bu ust birim secimi organizasyon agacinda dongu olusturur.'
        );
      }

      if (
        visited.has(
          cursor.parentUnitId
        )
      ) {
        break;
      }

      visited.add(
        cursor.parentUnitId
      );

      cursor =
        await client.organizationUnit.findFirst({
          where: {
            id:
              cursor.parentUnitId,
            companyId,
          },

          select: {
            id:
              true,
            parentUnitId:
              true,
          },
        });
    }
  }

  return parent;
}


async function validateOrganizationManagerPosition(
  companyId,
  organizationUnitId,
  managerPositionId,
  client = prisma
) {
  if (!managerPositionId) {
    return null;
  }

  const position =
    await client.position.findFirst({
      where: {
        id:
          managerPositionId,
        companyId,
        isActive:
          true,
      },

      include: {
        managedOrganizationUnit:
          true,
      },
    });

  if (!position) {
    throw new ApiError(
      400,
      'Secilen yonetici pozisyonu bulunamadi veya aktif degil.'
    );
  }

  if (
    position.organizationUnitId !==
    organizationUnitId
  ) {
    throw new ApiError(
      400,
      'Yonetici pozisyonu ilgili organizasyon birimine ait olmalidir.'
    );
  }

  if (
    position.managedOrganizationUnit &&
    position.managedOrganizationUnit.id !==
      organizationUnitId
  ) {
    throw new ApiError(
      409,
      'Bu pozisyon baska bir organizasyon biriminin yonetici pozisyonu olarak kullaniliyor.'
    );
  }

  return position;
}


/* ============================================================
   DINAMIK ORGANIZASYON - BIRIM TIPLERI
============================================================ */

async function listOrganizationUnitTypes(
  req,
  res
) {
  const {
    activeOnly = 'false',
    search,
  } = req.query;

  const items =
    await prisma.organizationUnitType.findMany({
      where: {
        companyId:
          req.companyId,

        ...(activeOnly ===
        'true'
          ? {
              isActive:
                true,
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  code: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
                {
                  name: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        _count: {
          select: {
            units:
              true,
          },
        },
      },

      orderBy: [
        {
          levelOrder:
            'asc',
        },
        {
          name:
            'asc',
        },
      ],
    });

  res.json({
    success:
      true,
    data: {
      items,
    },
  });
}


async function createOrganizationUnitType(
  req,
  res
) {
  const data =
    organizationUnitTypeCreateSchema.parse(
      req.body
    );

  const duplicate =
    await prisma.organizationUnitType.findFirst({
      where: {
        companyId:
          req.companyId,

        OR: [
          {
            code:
              data.code,
          },
          {
            name: {
              equals:
                data.name,
              mode:
                'insensitive',
            },
          },
        ],
      },
    });

  if (duplicate) {
    throw new ApiError(
      409,
      'Ayni kod veya adla bir organizasyon birimi tipi zaten tanimli.'
    );
  }

  const item =
    await prisma.organizationUnitType.create({
      data: {
        companyId:
          req.companyId,
        ...data,
      },
    });

  res.status(201).json({
    success:
      true,
    data:
      item,
  });
}


async function updateOrganizationUnitType(
  req,
  res
) {
  const data =
    organizationUnitTypeUpdateSchema.parse(
      req.body
    );

  const existing =
    await prisma.organizationUnitType.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Organizasyon birimi tipi bulunamadi.'
    );
  }

  if (
    data.code ||
    data.name
  ) {
    const duplicate =
      await prisma.organizationUnitType.findFirst({
        where: {
          companyId:
            req.companyId,
          id: {
            not:
              existing.id,
          },
          OR: [
            ...(data.code
              ? [
                  {
                    code:
                      data.code,
                  },
                ]
              : []),
            ...(data.name
              ? [
                  {
                    name: {
                      equals:
                        data.name,
                      mode:
                        'insensitive',
                    },
                  },
                ]
              : []),
          ],
        },
      });

    if (duplicate) {
      throw new ApiError(
        409,
        'Ayni kod veya adla baska bir organizasyon birimi tipi zaten tanimli.'
      );
    }
  }

  const item =
    await prisma.organizationUnitType.update({
      where: {
        id:
          existing.id,
      },
      data,
    });

  res.json({
    success:
      true,
    data:
      item,
  });
}


async function deactivateOrganizationUnitType(
  req,
  res
) {
  const existing =
    await prisma.organizationUnitType.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        units: {
          where: {
            isActive:
              true,
          },
          select: {
            id:
              true,
          },
          take:
            1,
        },
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Organizasyon birimi tipi bulunamadi.'
    );
  }

  if (
    existing.units.length >
    0
  ) {
    throw new ApiError(
      400,
      'Bu tipe bagli aktif organizasyon birimleri bulunuyor. Once ilgili birimleri tasiyin veya pasife alin.'
    );
  }

  const item =
    await prisma.organizationUnitType.update({
      where: {
        id:
          existing.id,
      },
      data: {
        isActive:
          false,
      },
    });

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   DINAMIK ORGANIZASYON - BIRIMLER
============================================================ */

async function listOrganizationUnits(
  req,
  res
) {
  const {
    activeOnly = 'false',
    search,
    typeId,
    parentUnitId,
  } = req.query;

  const items =
    await prisma.organizationUnit.findMany({
      where: {
        companyId:
          req.companyId,

        ...(activeOnly ===
        'true'
          ? {
              isActive:
                true,
            }
          : {}),

        ...(typeId
          ? {
              typeId,
            }
          : {}),

        ...(parentUnitId
          ? {
              parentUnitId:
                parentUnitId ===
                'ROOT'
                  ? null
                  : parentUnitId,
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  code: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
                {
                  name: {
                    contains:
                      search,
                    mode:
                      'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        type:
          true,

        parentUnit: {
          select: {
            id:
              true,
            code:
              true,
            name:
              true,
          },
        },

        managerPosition: {
          select: {
            id:
              true,
            positionCode:
              true,
            name:
              true,
            employee: {
              select: {
                id:
                  true,
                registryNo:
                  true,
                fullName:
                  true,
              },
            },
          },
        },

        _count: {
          select: {
            childUnits:
              true,
            positions:
              true,
          },
        },
      },

      orderBy: [
        {
          sortOrder:
            'asc',
        },
        {
          code:
            'asc',
        },
      ],
    });

  res.json({
    success:
      true,
    data: {
      items,
    },
  });
}


async function getOrganizationUnitById(
  req,
  res
) {
  const item =
    await prisma.organizationUnit.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        type:
          true,

        parentUnit: {
          include: {
            type:
              true,
          },
        },

        childUnits: {
          include: {
            type:
              true,
          },
          orderBy: [
            {
              sortOrder:
                'asc',
            },
            {
              code:
                'asc',
            },
          ],
        },

        managerPosition: {
          include: {
            employee:
              true,
          },
        },

        positions: {
          include: {
            employee: {
              select: {
                id:
                  true,
                registryNo:
                  true,
                fullName:
                  true,
                status:
                  true,
              },
            },
            parentPosition: {
              select: {
                id:
                  true,
                positionCode:
                  true,
                name:
                  true,
              },
            },
          },

          orderBy: {
            positionCode:
              'asc',
          },
        },
      },
    });

  if (!item) {
    throw new ApiError(
      404,
      'Organizasyon birimi bulunamadi.'
    );
  }

  res.json({
    success:
      true,
    data:
      item,
  });
}


async function createOrganizationUnit(
  req,
  res
) {
  const data =
    organizationUnitCreateSchema.parse(
      req.body
    );

  await validateOrganizationUnitType(
    req.companyId,
    data.typeId
  );

  await validateOrganizationParent(
    req.companyId,
    data.parentUnitId
  );

  const duplicate =
    await prisma.organizationUnit.findFirst({
      where: {
        companyId:
          req.companyId,

        parentUnitId:
          data.parentUnitId ||
          null,

        name: {
          equals:
            data.name,
          mode:
            'insensitive',
        },
      },
    });

  if (duplicate) {
    throw new ApiError(
      409,
      'Bu ust birim altinda ayni isimde bir organizasyon birimi zaten tanimli.'
    );
  }

  const item =
    await prisma.$transaction(
      async tx => {
        const code =
          await allocateOrganizationUnitCode(
            req.companyId,
            tx
          );

        const created =
          await tx.organizationUnit.create({
            data: {
              companyId:
                req.companyId,

              code,

              typeId:
                data.typeId,

              name:
                data.name,

              parentUnitId:
                data.parentUnitId ||
                null,

              description:
                data.description,

              sortOrder:
                data.sortOrder,

              isActive:
                data.isActive ??
                true,
            },
          });

        if (
          data.managerPositionId
        ) {
          await validateOrganizationManagerPosition(
            req.companyId,
            created.id,
            data.managerPositionId,
            tx
          );

          return tx.organizationUnit.update({
            where: {
              id:
                created.id,
            },
            data: {
              managerPositionId:
                data.managerPositionId,
            },
            include: {
              type:
                true,
              parentUnit:
                true,
              managerPosition: {
                include: {
                  employee:
                    true,
                },
              },
            },
          });
        }

        return tx.organizationUnit.findUnique({
          where: {
            id:
              created.id,
          },
          include: {
            type:
              true,
            parentUnit:
              true,
          },
        });
      }
    );

  res.status(201).json({
    success:
      true,
    data:
      item,
  });
}


async function updateOrganizationUnit(
  req,
  res
) {
  const data =
    organizationUnitUpdateSchema.parse(
      req.body
    );

  const existing =
    await prisma.organizationUnit.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Organizasyon birimi bulunamadi.'
    );
  }

  const nextTypeId =
    data.typeId ??
    existing.typeId;

  const nextParentUnitId =
    data.parentUnitId ===
      undefined
      ? existing.parentUnitId
      : data.parentUnitId;

  await validateOrganizationUnitType(
    req.companyId,
    nextTypeId
  );

  await validateOrganizationParent(
    req.companyId,
    nextParentUnitId,
    existing.id
  );

  if (data.name) {
    const duplicate =
      await prisma.organizationUnit.findFirst({
        where: {
          companyId:
            req.companyId,
          id: {
            not:
              existing.id,
          },
          parentUnitId:
            nextParentUnitId ||
            null,
          name: {
            equals:
              data.name,
            mode:
              'insensitive',
          },
        },
      });

    if (duplicate) {
      throw new ApiError(
        409,
        'Bu ust birim altinda ayni isimde baska bir organizasyon birimi zaten tanimli.'
      );
    }
  }

  const item =
    await prisma.$transaction(
      async tx => {
        const updated =
          await tx.organizationUnit.update({
            where: {
              id:
                existing.id,
            },

            data: {
              typeId:
                data.typeId,

              name:
                data.name,

              parentUnitId:
                data.parentUnitId ===
                  undefined
                  ? undefined
                  : data.parentUnitId ||
                    null,

              description:
                data.description,

              sortOrder:
                data.sortOrder,

              isActive:
                data.isActive,

              managerPositionId:
                data.managerPositionId ===
                  undefined
                  ? undefined
                  : null,
            },
          });

        if (
          data.managerPositionId
        ) {
          await validateOrganizationManagerPosition(
            req.companyId,
            existing.id,
            data.managerPositionId,
            tx
          );

          return tx.organizationUnit.update({
            where: {
              id:
                existing.id,
            },
            data: {
              managerPositionId:
                data.managerPositionId,
            },
            include: {
              type:
                true,
              parentUnit:
                true,
              managerPosition: {
                include: {
                  employee:
                    true,
                },
              },
            },
          });
        }

        return tx.organizationUnit.findUnique({
          where: {
            id:
              updated.id,
          },
          include: {
            type:
              true,
            parentUnit:
              true,
            managerPosition: {
              include: {
                employee:
                  true,
              },
            },
          },
        });
      }
    );

  res.json({
    success:
      true,
    data:
      item,
  });
}


async function deactivateOrganizationUnit(
  req,
  res
) {
  const existing =
    await prisma.organizationUnit.findFirst({
      where: {
        id:
          req.params.id,
        companyId:
          req.companyId,
      },

      include: {
        childUnits: {
          where: {
            isActive:
              true,
          },
          select: {
            id:
              true,
          },
          take:
            1,
        },

        positions: {
          where: {
            isActive:
              true,
          },
          select: {
            id:
              true,
          },
          take:
            1,
        },
      },
    });

  if (!existing) {
    throw new ApiError(
      404,
      'Organizasyon birimi bulunamadi.'
    );
  }

  if (
    existing.childUnits.length >
    0
  ) {
    throw new ApiError(
      400,
      'Bu organizasyon biriminin aktif alt birimleri bulunuyor. Once alt birimleri tasiyin veya pasife alin.'
    );
  }

  if (
    existing.positions.length >
    0
  ) {
    throw new ApiError(
      400,
      'Bu organizasyon birimine bagli aktif pozisyonlar bulunuyor. Once pozisyonlari baska bir birime tasiyin veya pasife alin.'
    );
  }

  const item =
    await prisma.organizationUnit.update({
      where: {
        id:
          existing.id,
      },

      data: {
        isActive:
          false,
      },
    });

  res.json({
    success:
      true,
    data:
      item,
  });
}


/* ============================================================
   DINAMIK ORGANIZASYON - AGAC
============================================================ */

function buildOrganizationUnitTree(
  items
) {
  const nodeMap =
    new Map();

  const roots =
    [];

  for (
    const item
    of items
  ) {
    nodeMap.set(
      item.id,
      {
        ...item,
        children:
          [],
      }
    );
  }

  for (
    const item
    of items
  ) {
    const node =
      nodeMap.get(
        item.id
      );

    if (
      item.parentUnitId &&
      nodeMap.has(
        item.parentUnitId
      )
    ) {
      nodeMap
        .get(
          item.parentUnitId
        )
        .children
        .push(
          node
        );
    }
    else {
      roots.push(
        node
      );
    }
  }

  const sortNodes =
    nodes => {
      nodes.sort(
        (
          left,
          right
        ) => {
          const orderDiff =
            (
              left.sortOrder ||
              0
            ) -
            (
              right.sortOrder ||
              0
            );

          if (
            orderDiff !==
            0
          ) {
            return orderDiff;
          }

          return String(
            left.code
          ).localeCompare(
            String(
              right.code
            ),
            'tr'
          );
        }
      );

      for (
        const node
        of nodes
      ) {
        sortNodes(
          node.children
        );
      }
    };

  sortNodes(
    roots
  );

  return roots;
}


async function getOrganizationTree(
  req,
  res
) {
  const items =
    await prisma.organizationUnit.findMany({
      where: {
        companyId:
          req.companyId,

        isActive:
          true,
      },

      include: {
        type:
          true,

        managerPosition: {
          select: {
            id:
              true,
            positionCode:
              true,
            name:
              true,

            employee: {
              select: {
                id:
                  true,
                registryNo:
                  true,
                fullName:
                  true,
                status:
                  true,
              },
            },
          },
        },

        positions: {
          where: {
            isActive:
              true,
          },

          select: {
            id:
              true,
            positionCode:
              true,
            name:
              true,
            parentPositionId:
              true,
            normCount:
              true,

            employee: {
              select: {
                id:
                  true,
                registryNo:
                  true,
                fullName:
                  true,
                status:
                  true,
              },
            },
          },

          orderBy: {
            positionCode:
              'asc',
          },
        },
      },
    });

  const tree =
    buildOrganizationUnitTree(
      items
    );

  res.json({
    success:
      true,

    data: {
      tree,
      totalUnits:
        items.length,
    },
  });
}



/* ============================================================
   EXPORTS
============================================================ */

module.exports = {

  // Dinamik Organizasyon - Birim Tipleri
  listOrganizationUnitTypes,
  createOrganizationUnitType,
  updateOrganizationUnitType,
  deactivateOrganizationUnitType,

  // Dinamik Organizasyon - Birimler
  listOrganizationUnits,
  getOrganizationUnitById,
  createOrganizationUnit,
  updateOrganizationUnit,
  deactivateOrganizationUnit,
  getOrganizationTree,

  // Genel Mudurluk
  getGeneralManagement,
  updateGeneralManagement,

  // Direktorluk
  listDirectorates,
  getDirectorateById,
  createDirectorate,
  updateDirectorate,
  deactivateDirectorate,

  // Mudurluk
  listManagements,
  getManagementById,
  createManagement,
  updateManagement,
  deactivateManagement,

  // Bolum
  listOrganizationDepartments,
  getOrganizationDepartmentById,
  createOrganizationDepartment,
  updateOrganizationDepartment,
  deactivateOrganizationDepartment,

  // Pozisyon
  listPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deactivatePosition,

};
