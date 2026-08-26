const prisma = require('../config/prisma');


/* ============================================================
   DASHBOARD - PERSONEL VERI KALITESI
============================================================ */

function addQualityIssue(
  issues,
  employee,
  {
    field,
    label,
    message,
    severity = 'WARNING',
    category = 'OZLUK',
  }
) {

  issues.push({
    employeeId:
      employee.id,

    registryNo:
      employee.registryNo,

    fullName:
      employee.fullName,

    position:
      employee.positionMaster?.name ||
      employee.position ||
      null,

    field,

    label,

    message,

    severity,

    category,

    /*
     * Frontend bu alani kullanarak dogrudan
     * ilgili personelin ozluk kartini acabilir.
     */
    action: {
      type:
        'EMPLOYEE_DETAIL',

      employeeId:
        employee.id,

      label:
        'Özlük Kartına Git',
    },
  });

}


function evaluateEmployeeQuality(
  employee
) {

  const issues =
    [];

  let possibleChecks =
    0;

  let passedChecks =
    0;


  function check({
    ok,
    field,
    label,
    message,
    severity = 'WARNING',
    category = 'OZLUK',
  }) {

    possibleChecks +=
      1;

    if (ok) {

      passedChecks +=
        1;

      return;

    }

    addQualityIssue(
      issues,
      employee,
      {
        field,
        label,
        message,
        severity,
        category,
      }
    );

  }


  /* ==========================================================
     KRITIK / TEMEL OZLUK BILGILERI
  ========================================================== */

  check({
    ok:
      Boolean(
        employee.nationalId
      ),
    field:
      'nationalId',
    label:
      'T.C. Kimlik No',
    message:
      'T.C. kimlik numarası eksik.',
    severity:
      'CRITICAL',
  });

  check({
    ok:
      Boolean(
        employee.firstName
      ),
    field:
      'firstName',
    label:
      'Ad',
    message:
      'Ad bilgisi eksik.',
    severity:
      'CRITICAL',
  });

  check({
    ok:
      Boolean(
        employee.lastName
      ),
    field:
      'lastName',
    label:
      'Soyad',
    message:
      'Soyad bilgisi eksik.',
    severity:
      'CRITICAL',
  });

  check({
    ok:
      Boolean(
        employee.birthDate
      ),
    field:
      'birthDate',
    label:
      'Doğum Tarihi',
    message:
      'Doğum tarihi eksik.',
    severity:
      'CRITICAL',
  });

  check({
    ok:
      Boolean(
        employee.hireDate
      ),
    field:
      'hireDate',
    label:
      'İşe Giriş Tarihi',
    message:
      'İşe giriş tarihi eksik.',
    severity:
      'CRITICAL',
  });


  /* ==========================================================
     ORGANIZASYON
  ========================================================== */

  check({
    ok:
      Boolean(
        employee.positionMasterId &&
        employee.positionMaster
      ),
    field:
      'positionMasterId',
    label:
      'Pozisyon',
    message:
      'Personel aktif bir pozisyon master kaydına bağlı değil.',
    severity:
      'CRITICAL',
    category:
      'ORGANIZATION',
  });

  check({
    ok:
      Boolean(
        employee.positionMaster?.organizationUnitId
      ),
    field:
      'organizationUnitId',
    label:
      'Organizasyon Birimi',
    message:
      'Pozisyon bir organizasyon birimine bağlı değil.',
    severity:
      'CRITICAL',
    category:
      'ORGANIZATION',
  });

  /*
   * Root pozisyonlarda üst yönetici olmaması normaldir.
   * Sadece üst pozisyonu bulunan çalışanlarda managerId aranır.
   */
  if (
    employee.positionMaster?.parentPositionId
  ) {

    check({
      ok:
        Boolean(
          employee.managerId
        ),
      field:
        'managerId',
      label:
        'Bağlı Yönetici',
      message:
        'Pozisyonun üst pozisyonu var ancak personele bağlı yönetici atanmamış.',
      severity:
        'WARNING',
      category:
        'ORGANIZATION',
    });

  }


  /* ==========================================================
     SGK / ISTIHDAM
  ========================================================== */

  check({
    ok:
      Boolean(
        employee.occupationCode
      ),
    field:
      'occupationCode',
    label:
      'Meslek Kodu',
    message:
      'Meslek kodu eksik.',
    severity:
      'CRITICAL',
    category:
      'SGK',
  });

  check({
    ok:
      Boolean(
        employee.sgkDocumentTypeCode
      ),
    field:
      'sgkDocumentTypeCode',
    label:
      'SGK Belge Türü',
    message:
      'SGK belge türü eksik.',
    severity:
      'CRITICAL',
    category:
      'SGK',
  });

  check({
    ok:
      Boolean(
        employee.contractType
      ),
    field:
      'contractType',
    label:
      'Sözleşme Türü',
    message:
      'Sözleşme türü eksik.',
    severity:
      'WARNING',
    category:
      'EMPLOYMENT',
  });

  check({
    ok:
      Boolean(
        employee.employmentType
      ),
    field:
      'employmentType',
    label:
      'Çalışma Türü',
    message:
      'Çalışma türü eksik.',
    severity:
      'WARNING',
    category:
      'EMPLOYMENT',
  });

  check({
    ok:
      Boolean(
        employee.collarType
      ),
    field:
      'collarType',
    label:
      'Yaka Türü',
    message:
      'Yaka türü eksik.',
    severity:
      'WARNING',
    category:
      'EMPLOYMENT',
  });


  /* ==========================================================
     BAZ TARIHLER
  ========================================================== */

  check({
    ok:
      Boolean(
        employee.seniorityBaseDate
      ),
    field:
      'seniorityBaseDate',
    label:
      'Kıdem Baz Tarihi',
    message:
      'Kıdem baz tarihi eksik.',
    severity:
      'WARNING',
    category:
      'EMPLOYMENT',
  });

  check({
    ok:
      Boolean(
        employee.annualLeaveBaseDate
      ),
    field:
      'annualLeaveBaseDate',
    label:
      'Yıllık İzin Baz Tarihi',
    message:
      'Yıllık izin baz tarihi eksik.',
    severity:
      'WARNING',
    category:
      'EMPLOYMENT',
  });

  check({
    ok:
      Boolean(
        employee.groupHireDate
      ),
    field:
      'groupHireDate',
    label:
      'Topluluk İşe Giriş Tarihi',
    message:
      'Topluluk işe giriş tarihi eksik.',
    severity:
      'WARNING',
    category:
      'EMPLOYMENT',
  });


  /* ==========================================================
     ILETISIM
  ========================================================== */

  check({
    ok:
      Boolean(
        employee.phone
      ),
    field:
      'phone',
    label:
      'Telefon',
    message:
      'Telefon bilgisi eksik.',
    severity:
      'WARNING',
    category:
      'CONTACT',
  });

  check({
    ok:
      Boolean(
        employee.email ||
        employee.corporateEmail
      ),
    field:
      'email',
    label:
      'E-Posta',
    message:
      'Kişisel veya kurumsal e-posta bilgilerinden en az biri girilmelidir.',
    severity:
      'WARNING',
    category:
      'CONTACT',
  });

  check({
    ok:
      Boolean(
        employee.address &&
        employee.city &&
        employee.country
      ),
    field:
      'address',
    label:
      'Adres',
    message:
      'Adres / şehir / ülke bilgilerinden biri veya birkaçı eksik.',
    severity:
      'WARNING',
    category:
      'CONTACT',
  });


  /* ==========================================================
     KOSULLU KURALLAR
  ========================================================== */

  if (
    employee.maritalStatus ===
      'MARRIED'
  ) {

    check({
      ok:
        Boolean(
          employee.marriageDate
        ),
      field:
        'marriageDate',
      label:
        'Evlilik Tarihi',
      message:
        'Medeni durum Evli olduğu için evlilik tarihi girilmelidir.',
      severity:
        'WARNING',
    });

  }


  if (
    employee.militaryStatus ===
      'DEFERRED'
  ) {

    check({
      ok:
        Boolean(
          employee.militaryDefermentDate
        ),
      field:
        'militaryDefermentDate',
      label:
        'Askerlik Tecil Tarihi',
      message:
        'Askerlik durumu Tecilli olduğu için tecil tarihi girilmelidir.',
      severity:
        'WARNING',
    });

  }


  if (
    employee.isDisabled
  ) {

    check({
      ok:
        Number(
          employee.disabilityRate ||
          0
        ) >
        0,
      field:
        'disabilityRate',
      label:
        'Engellilik Oranı',
      message:
        'Personel engelli olarak işaretli ancak engellilik oranı girilmemiş.',
      severity:
        'WARNING',
      category:
        'SGK',
    });

  }


  /* ==========================================================
     BANKA
  ========================================================== */

  check({
    ok:
      employee.bankAccounts.some(
        account =>
          account.isActive &&
          Boolean(
            account.iban
          )
      ),
    field:
      'bankAccounts',
    label:
      'Banka / IBAN',
    message:
      'Aktif IBAN bilgisi bulunmuyor.',
    severity:
      'WARNING',
    category:
      'PAYROLL',
  });


  return {
    issues,
    possibleChecks,
    passedChecks,
  };

}


/* ============================================================
   MESLEK KODU SUPHE KONTROLU

   Ayni meslek kodu 3 veya daha fazla farkli pozisyon adinda
   kullaniliyorsa personeller icin "kontrol edilmeli" uyarisi
   olusturulur. Bu bir hata degildir; veri kalite sinyalidir.
============================================================ */

function buildOccupationCodeWarnings(
  employees
) {

  const map =
    new Map();


  for (
    const employee
    of employees
  ) {

    if (
      !employee.occupationCode
    ) {
      continue;
    }


    const positionName =
      employee.positionMaster?.name ||
      employee.position ||
      'Pozisyon Yok';


    if (
      !map.has(
        employee.occupationCode
      )
    ) {

      map.set(
        employee.occupationCode,
        {
          positionNames:
            new Set(),
          employees:
            [],
        }
      );

    }


    const item =
      map.get(
        employee.occupationCode
      );


    item.positionNames.add(
      positionName
    );

    item.employees.push(
      employee
    );

  }


  const warnings =
    [];


  for (
    const [
      occupationCode,
      item
    ] of map.entries()
  ) {

    /*
     * Ayni meslek kodu en az 3 farkli pozisyon unvaninda
     * kullaniliyorsa kontrol sinyali veriyoruz.
     */
    if (
      item.positionNames.size <
      3
    ) {
      continue;
    }


    for (
      const employee
      of item.employees
    ) {

      addQualityIssue(
        warnings,
        employee,
        {
          field:
            'occupationCode',
          label:
            'Meslek Kodu Kontrolü',
          message:
            `${occupationCode} meslek kodu ${item.positionNames.size} farklı pozisyon unvanında kullanılıyor. Meslek kodunun doğruluğunu kontrol edin.`,
          severity:
            'CHECK',
          category:
            'SGK',
        }
      );

    }

  }


  return warnings;

}


/* ============================================================
   DASHBOARD SUMMARY
============================================================ */

async function summary(
  req,
  res
) {

  const companyId =
    req.companyId;


  const [
    totalEmployees,
    activeEmployees,
    probationEmployees,
    pendingLeaves,
    recentEmployees,
    employeesForDashboard,
  ] =
    await Promise.all([

      prisma.employee.count({
        where: {
          companyId,
        },
      }),

      prisma.employee.count({
        where: {
          companyId,
          status:
            'ACTIVE',
        },
      }),

      prisma.employee.count({
        where: {
          companyId,
          status:
            'PROBATION',
        },
      }),

      prisma.leaveRequest.count({
        where: {
          status:
            'PENDING',

          employee: {
            companyId,
          },
        },
      }),

      prisma.employee.findMany({
        where: {
          companyId,
        },

        orderBy: {
          createdAt:
            'desc',
        },

        take:
          5,

        select: {
          id:
            true,
          fullName:
            true,
          position:
            true,
          createdAt:
            true,
        },
      }),

      /*
       * Veri kalite kontrolu icin sadece aktif organizasyondaki
       * personelleri tarayalim. TERMINATED personeller uyarilara
       * dahil edilmez.
       */
      prisma.employee.findMany({
        where: {
          companyId,

          status: {
            in: [
              'ACTIVE',
              'PROBATION',
            ],
          },
        },

        select: {
          id:
            true,

          registryNo:
            true,

          nationalId:
            true,

          firstName:
            true,

          lastName:
            true,

          fullName:
            true,

          birthDate:
            true,

          maritalStatus:
            true,

          marriageDate:
            true,

          militaryStatus:
            true,

          militaryDefermentDate:
            true,

          phone:
            true,

          email:
            true,

          corporateEmail:
            true,

          address:
            true,

          city:
            true,

          country:
            true,

          position:
            true,

          positionMasterId:
            true,

          managerId:
            true,

          occupationCode:
            true,

          contractType:
            true,

          employmentType:
            true,

          collarType:
            true,

          sgkDocumentTypeCode:
            true,

          hireDate:
            true,

          seniorityBaseDate:
            true,

          annualLeaveBaseDate:
            true,

          groupHireDate:
            true,

          isDisabled:
            true,

          disabilityRate:
            true,

          positionMaster: {
            select: {
              id:
                true,

              positionCode:
                true,

              name:
                true,

              organizationUnitId:
                true,

              parentPositionId:
                true,

              organizationUnit: {
                select: {
                  id:
                    true,
                  code:
                    true,
                  name:
                    true,
                },
              },
            },
          },

          bankAccounts: {
            where: {
              isActive:
                true,
            },

            select: {
              id:
                true,
              iban:
                true,
              isPrimary:
                true,
              isActive:
                true,
            },
          },
        },
      }),

    ]);


  /* ==========================================================
     YAKLASAN DOGUM GUNLERI
  ========================================================== */

  const today =
    new Date();


  const upcomingBirthdays =
    employeesForDashboard
      .filter(
        employee =>
          Boolean(
            employee.birthDate
          )
      )
      .map(
        employee => {

          const birthDate =
            new Date(
              employee.birthDate
            );

          const next =
            new Date(
              today.getFullYear(),
              birthDate.getMonth(),
              birthDate.getDate()
            );


          if (
            next <
            today
          ) {
            next.setFullYear(
              today.getFullYear() +
              1
            );
          }


          const daysUntil =
            Math.round(
              (
                next -
                today
              ) /
              (
                1000 *
                60 *
                60 *
                24
              )
            );


          return {
            id:
              employee.id,

            fullName:
              employee.fullName,

            birthDate:
              employee.birthDate,

            daysUntil,
          };

        }
      )
      .filter(
        employee =>
          employee.daysUntil <=
          30
      )
      .sort(
        (
          left,
          right
        ) =>
          left.daysUntil -
          right.daysUntil
      );


  /* ==========================================================
     PERSONEL VERI KALITESI
  ========================================================== */

  const qualityIssues =
    [];

  let totalPossibleChecks =
    0;

  let totalPassedChecks =
    0;


  for (
    const employee
    of employeesForDashboard
  ) {

    const result =
      evaluateEmployeeQuality(
        employee
      );


    qualityIssues.push(
      ...result.issues
    );


    totalPossibleChecks +=
      result.possibleChecks;


    totalPassedChecks +=
      result.passedChecks;

  }


  /*
   * Eksik degil ama supheli olabilecek kalite sinyalleri.
   * Ornegin herkese ayni meslek kodu verilmesi.
   */
  qualityIssues.push(
    ...buildOccupationCodeWarnings(
      employeesForDashboard
    )
  );


  const criticalCount =
    qualityIssues.filter(
      issue =>
        issue.severity ===
        'CRITICAL'
    ).length;


  const warningCount =
    qualityIssues.filter(
      issue =>
        issue.severity ===
        'WARNING'
    ).length;


  const checkCount =
    qualityIssues.filter(
      issue =>
        issue.severity ===
        'CHECK'
    ).length;


  const affectedEmployeeIds =
    new Set(
      qualityIssues.map(
        issue =>
          issue.employeeId
      )
    );


  const completionRate =
    totalPossibleChecks >
      0
      ? Math.round(
          (
            totalPassedChecks /
            totalPossibleChecks
          ) *
          100
        )
      : 100;


  /*
   * Dashboard ekraninda once kritikler, sonra uyarilar,
   * sonra kontrol sinyalleri gorunsun.
   */
  const severityOrder = {
    CRITICAL:
      1,
    WARNING:
      2,
    CHECK:
      3,
  };


  qualityIssues.sort(
    (
      left,
      right
    ) => {

      const severityDiff =
        (
          severityOrder[
            left.severity
          ] ||
          9
        ) -
        (
          severityOrder[
            right.severity
          ] ||
          9
        );


      if (
        severityDiff !==
        0
      ) {
        return severityDiff;
      }


      return String(
        left.fullName ||
        ''
      ).localeCompare(
        String(
          right.fullName ||
          ''
        ),
        'tr'
      );

    }
  );


  res.json({

    success:
      true,

    data: {

      totalEmployees,

      activeEmployees,

      probationEmployees,

      pendingLeaves,

      recentEmployees,

      upcomingBirthdays,

      /*
       * Dashboard.html bu objeyi kullanacak.
       */
      dataQuality: {

        completionRate,

        checkedEmployeeCount:
          employeesForDashboard.length,

        affectedEmployeeCount:
          affectedEmployeeIds.size,

        totalIssueCount:
          qualityIssues.length,

        criticalCount,

        warningCount,

        checkCount,

        /*
         * Ilk ekranda tum detaylari verebiliriz.
         * Veri buyudukce bunu ayri endpoint + pagination'a
         * cevirmek kolay olacak.
         */
        issues:
          qualityIssues,

      },

    },

  });

}


module.exports = {
  summary,
};
