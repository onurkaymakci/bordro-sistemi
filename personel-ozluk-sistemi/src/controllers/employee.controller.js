const { z } = require('zod');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');

const prisma = require('../config/prisma');

const ApiError = require('../utils/ApiError');
const { assertEmployeeAccess } = require('../policies/employee-object-access.policy');


/* ============================================================
   HR PLANET
   EMPLOYEE CONTROLLER

   Personel:
   - Otomatik 8 haneli sicil
   - Kişisel bilgiler
   - İletişim
   - Aile
   - Eğitim
   - Banka
   - Acil durum
   - Organizasyon
   - İşe giriş / SGK
   - İşten ayrılış

   Ücret bilgileri bu aşamada controller'a dahil değildir.
============================================================ */


/* ============================================================
   ZOD HELPERS
============================================================ */

const emptyToUndefined = (schema) =>
  z.preprocess(
    (value) => {

      if (
        value === '' ||
        value === null ||
        value === undefined
      ) {
        return undefined;
      }

      return value;

    },
    schema.optional()
  );


const optionalString =
  emptyToUndefined(
    z.string()
  );


const optionalUuid =
  emptyToUndefined(
    z.string().uuid()
  );


const optionalDate =
  emptyToUndefined(
    z.coerce.date()
  );


const optionalNumber =
  z.preprocess(
    (value) => {

      if (
        value === '' ||
        value === null ||
        value === undefined
      ) {
        return undefined;
      }

      const number =
        Number(value);

      return Number.isNaN(number)
        ? value
        : number;

    },
    z.number().optional()
  );


const optionalBoolean =
  z.preprocess(
    (value) => {

      if (
        value === '' ||
        value === null ||
        value === undefined
      ) {
        return undefined;
      }

      if (value === 'true') {
        return true;
      }

      if (value === 'false') {
        return false;
      }

      return value;

    },
    z.boolean().optional()
  );


const requiredBoolean =
  z.preprocess(
    (value) => {

      if (value === 'true') {
        return true;
      }

      if (value === 'false') {
        return false;
      }

      return value;

    },
    z.boolean()
  );


const requiredDate =
  z.coerce.date({
    required_error:
      'Tarih alani zorunludur.',
    invalid_type_error:
      'Gecerli bir tarih giriniz.',
  });


const requiredText =
  (message) =>
    z
      .string()
      .trim()
      .min(
        1,
        message
      );


/* ============================================================
   BANKA HESABI
============================================================ */

const bankAccountSchema =
  z.object({

    bankId:
      z
        .string()
        .uuid(
          'Gecerli bir banka seciniz.'
        ),

    accountNo:
      requiredText(
        'Banka hesap numarasi zorunludur.'
      ),

    iban:
      z
        .string()
        .trim()
        .min(
          1,
          'IBAN zorunludur.'
        )
        .transform(
          value =>
            value
              .replace(/\s/g, '')
              .toUpperCase()
        )
        .refine(
          value =>
            /^TR[A-Z0-9]{24}$/.test(value),
          {
            message:
              'IBAN TR ile baslamali ve toplam 26 karakter olmalidir.',
          }
        ),

    isPrimary:
      requiredBoolean,

    isActive:
      z
        .boolean()
        .optional()
        .default(true),

  });


/* ============================================================
   EGITIM
============================================================ */

const educationSchema =
  z.object({

    level:
      z.enum(
        [
          'PRIMARY',
          'SECONDARY',
          'HIGH_SCHOOL',
          'ASSOCIATE',
          'BACHELOR',
          'MASTER',
          'DOCTORATE',
          'OTHER',
        ],
        {
          required_error:
            'Egitim seviyesi zorunludur.',
        }
      ),

    schoolName:
      requiredText(
        'Okul adi zorunludur.'
      ),

    departmentName:
      optionalString,

    startDate:
      requiredDate,

    endDate:
      optionalDate,

    isContinuing:
      z
        .boolean()
        .default(false),

    notes:
      optionalString,

  });


/* ============================================================
   AILE BILGILERI
============================================================ */

const familyMemberSchema =
  z.object({

    relationType:
      z.enum([
        'SPOUSE',
        'CHILD',
        'MOTHER',
        'FATHER',
        'OTHER',
      ]),

    firstName:
      requiredText(
        'Aile bireyi adi zorunludur.'
      ),

    lastName:
      optionalString,

    nationalId:
      emptyToUndefined(
        z
          .string()
          .regex(
            /^\d{11}$/,
            'T.C. kimlik numarasi 11 haneli olmalidir.'
          )
      ),

    birthDate:
      optionalDate,

    gender:
      z
        .enum([
          'FEMALE',
          'MALE',
          'UNSPECIFIED',
        ])
        .optional(),

    educationLevel:
      z
        .enum([
          'PRIMARY',
          'SECONDARY',
          'HIGH_SCHOOL',
          'ASSOCIATE',
          'BACHELOR',
          'MASTER',
          'DOCTORATE',
          'OTHER',
        ])
        .optional(),

    childAllowanceEligible:
      z
        .boolean()
        .optional()
        .default(false),

    isDependent:
      optionalBoolean,

    schoolName:
      optionalString,

    educationStartDate:
      optionalDate,

    educationEndDate:
      optionalDate,

    isEducationContinuing:
      z
        .boolean()
        .optional()
        .default(false),

    notes:
      optionalString,

  });


/* ============================================================
   ACIL DURUM KISI
============================================================ */

const emergencyContactSchema =
  z.object({

    fullName:
      requiredText(
        'Acil durum kisisi ad soyad zorunludur.'
      ),

    relation:
      requiredText(
        'Acil durum kisisi yakinlik derecesi zorunludur.'
      ),

    phone:
      requiredText(
        'Acil durum kisisi telefonu zorunludur.'
      ),

    isPrimary:
      z
        .boolean()
        .optional()
        .default(false),

    notes:
      optionalString,

  });


/* ============================================================
   PERSONEL BASE SCHEMA
============================================================ */

const employeeBaseSchema =
  z.object({

    /*
     * registryNo YOK.
     *
     * Sicil backend tarafindan otomatik
     * olusturulur ve request'ten kabul edilmez.
     */


    /* ========================================================
       01 - KISISEL BILGILER
    ======================================================== */

    nationalId:
      z
        .string()
        .regex(
          /^\d{11}$/,
          'T.C. kimlik numarasi 11 haneli olmalidir.'
        ),

    firstName:
      requiredText(
        'Ad alani zorunludur.'
      ),

    lastName:
      requiredText(
        'Soyad alani zorunludur.'
      ),

    birthDate:
      requiredDate,

    gender:
      z.enum(
        [
          'FEMALE',
          'MALE',
          'UNSPECIFIED',
        ],
        {
          required_error:
            'Cinsiyet zorunludur.',
        }
      ),

    maritalStatus:
      z.enum(
        [
          'SINGLE',
          'MARRIED',
          'DIVORCED',
          'WIDOWED',
          'UNSPECIFIED',
        ],
        {
          required_error:
            'Medeni durum zorunludur.',
        }
      ),

    marriageDate:
      optionalDate,

    nationality:
      requiredText(
        'Uyruk zorunludur.'
      ),

    militaryStatus:
      z.enum(
        [
          'NOT_APPLICABLE',
          'COMPLETED',
          'EXEMPT',
          'DEFERRED',
          'ACTIVE',
          'UNKNOWN',
        ],
        {
          required_error:
            'Askerlik durumu zorunludur.',
        }
      ),

    militaryDefermentDate:
      optionalDate,


    /* ========================================================
       02 - ILETISIM BILGILERI
    ======================================================== */

    phone:
      requiredText(
        'Telefon zorunludur.'
      ),

    email:
      emptyToUndefined(
        z
          .string()
          .email(
            'Gecerli bir kisisel e-posta adresi giriniz.'
          )
      ),

    corporateEmail:
      emptyToUndefined(
        z
          .string()
          .email(
            'Gecerli bir kurumsal e-posta adresi giriniz.'
          )
      ),

    address:
      requiredText(
        'Adres zorunludur.'
      ),

    city:
      requiredText(
        'Sehir zorunludur.'
      ),

    country:
      requiredText(
        'Ulke zorunludur.'
      ),


    /* ========================================================
       07 - ORGANIZASYON BILGILERI
    ======================================================== */

    departmentId:
      z
        .string()
        .uuid(
          'Departman secimi zorunludur.'
        ),

    position:
      requiredText(
        'Pozisyon zorunludur.'
      ),

    workLocation:
      requiredText(
        'Calisma yeri zorunludur.'
      ),

    collarType:
      z.enum(
        [
          'WHITE_COLLAR',
          'BLUE_COLLAR',
          'OTHER',
        ],
        {
          required_error:
            'Yaka turu zorunludur.',
        }
      ),

    managerId:
      z
        .string()
        .uuid(
          'Yonetici secimi zorunludur.'
        ),

    occupationCode:
      requiredText(
        'Meslek kodu zorunludur.'
      ),


    /* ========================================================
       ISE GIRIS VE SGK
    ======================================================== */

    hireDate:
      requiredDate,

    /*
     * Kullanici istegi geregi
     * SADECE bu tarih opsiyonel.
     */
    firstHireDate:
      optionalDate,

    seniorityBaseDate:
      requiredDate,

    annualLeaveBaseDate:
      requiredDate,

    groupHireDate:
      requiredDate,

    contractType:
      z.enum(
        [
          'INDEFINITE',
          'FIXED_TERM',
          'OTHER',
        ],
        {
          required_error:
            'Sozlesme turu zorunludur.',
        }
      ),

    employmentType:
      z.enum(
        [
          'FULL_TIME',
          'PART_TIME',
          'OTHER',
        ],
        {
          required_error:
            'Calisma turu zorunludur.',
        }
      ),

    sgkDocumentTypeCode:
      requiredText(
        'SGK belge turu zorunludur.'
      ),

    incentiveCode:
      requiredText(
        'Tesvik / Kanun No secimi zorunludur.'
      ),

    isDisabled:
      requiredBoolean,

    disabilityRate:
      optionalNumber,


    /* ========================================================
       ALT TABLOLAR
    ======================================================== */

    bankAccounts:
      z
        .array(
          bankAccountSchema
        )
        .min(
          1,
          'En az bir banka hesabi eklemelisiniz.'
        ),

    educations:
      z
        .array(
          educationSchema
        )
        .min(
          1,
          'En az bir egitim bilgisi eklemelisiniz.'
        ),

    familyMembers:
      z
        .array(
          familyMemberSchema
        )
        .optional()
        .default([]),

    emergencyContacts:
      z
        .array(
          emergencyContactSchema
        )
        .min(
          1,
          'En az bir acil durum kisisi eklemelisiniz.'
        ),

  });


/* ============================================================
   CREATE / UPDATE SCHEMA
============================================================ */

const createEmployeeSchema =
  employeeBaseSchema;


const updateEmployeeSchema =
  employeeBaseSchema.partial();


/* ============================================================
   ISTEN CIKIS SCHEMA
============================================================ */

const deactivateSchema =
  z.object({

    terminationDate:
      z.coerce.date({
        required_error:
          'Isten ayrilis tarihi zorunludur.',
      }),

    terminationReasonCode:
      requiredText(
        'SGK isten cikis kodu zorunludur.'
      ),

    terminationNote:
      optionalString,

  });


/* ============================================================
   BUSINESS VALIDATION
============================================================ */

function validateBusinessRules(
  data,
  {
    isUpdate = false,
    existing = null,
  } = {}
) {

  /*
   * UPDATE'te request'te olmayan ana alanlari
   * mevcut personel kaydindan tamamliyoruz.
   */

  const merged =
    isUpdate && existing
      ? {
          ...existing,
          ...data,
        }
      : data;


  /* ----------------------------------------------------------
     EVLILIK TARIHI
  ---------------------------------------------------------- */

  if (
    merged.maritalStatus ===
      'MARRIED' &&
    !merged.marriageDate
  ) {

    throw new ApiError(
      400,
      'Medeni durum Evli ise evlilik tarihi zorunludur.'
    );

  }


  /* ----------------------------------------------------------
     ASKERLIK TECIL
  ---------------------------------------------------------- */

  if (
    merged.militaryStatus ===
      'DEFERRED' &&
    !merged.militaryDefermentDate
  ) {

    throw new ApiError(
      400,
      'Askerlik durumu Tecilli ise tecil tarihi zorunludur.'
    );

  }


  /* ----------------------------------------------------------
     ENGELLILIK
  ---------------------------------------------------------- */

  if (
    merged.isDisabled === true
  ) {

    const rate =
      Number(
        merged.disabilityRate
      );

    if (
      !Number.isFinite(rate) ||
      rate <= 0 ||
      rate > 100
    ) {

      throw new ApiError(
        400,
        'Engelli personel icin 0 ile 100 arasinda engellilik orani girilmelidir.'
      );

    }

  }


  /*
   * Engelli degilse oran tutulmasin.
   */

  if (
    data.isDisabled === false
  ) {

    data.disabilityRate =
      null;

  }


  /* ----------------------------------------------------------
     BANKA
  ---------------------------------------------------------- */

  if (
    data.bankAccounts !==
      undefined
  ) {

    if (
      data.bankAccounts.length <
      1
    ) {

      throw new ApiError(
        400,
        'En az bir banka hesabi eklemelisiniz.'
      );

    }


    const primaryAccounts =
      data.bankAccounts.filter(
        account =>
          account.isPrimary === true
      );


    if (
      primaryAccounts.length !==
      1
    ) {

      throw new ApiError(
        400,
        'Banka hesaplarindan tam olarak bir tanesi Ana Hesap olarak secilmelidir.'
      );

    }


    /*
     * Ayni IBAN iki kez eklenmesin.
     */

    const ibanList =
      data.bankAccounts.map(
        account =>
          account.iban
            .replace(/\s/g, '')
            .toUpperCase()
      );


    if (
      new Set(ibanList).size !==
      ibanList.length
    ) {

      throw new ApiError(
        400,
        'Ayni IBAN birden fazla banka hesabinda kullanilamaz.'
      );

    }

  }


  /* ----------------------------------------------------------
     EGITIM
  ---------------------------------------------------------- */

  if (
    data.educations !==
      undefined
  ) {

    if (
      data.educations.length <
      1
    ) {

      throw new ApiError(
        400,
        'En az bir egitim bilgisi eklemelisiniz.'
      );

    }


    data.educations.forEach(
      (
        education,
        index
      ) => {

        if (
          education.isContinuing !==
            true &&
          !education.endDate
        ) {

          throw new ApiError(
            400,
            `${index + 1}. egitim kaydinda egitim devam etmiyorsa bitis tarihi zorunludur.`
          );

        }


        if (
          education.startDate &&
          education.endDate &&
          new Date(
            education.endDate
          ) <
            new Date(
              education.startDate
            )
        ) {

          throw new ApiError(
            400,
            `${index + 1}. egitim kaydinda bitis tarihi baslangic tarihinden once olamaz.`
          );

        }


        /*
         * Devam ediyor ise bitis tarihi tutulmaz.
         */

        if (
          education.isContinuing ===
          true
        ) {

          education.endDate =
            null;

        }

      }
    );

  }


  /* ----------------------------------------------------------
     AILE / COCUK
  ---------------------------------------------------------- */

  if (
    data.familyMembers !==
      undefined
  ) {

    data.familyMembers.forEach(
      (
        member,
        index
      ) => {

        /*
         * Cocuk olmayan aile bireyinde
         * cocuk yardimi false tutulur.
         */

        if (
          member.relationType !==
          'CHILD'
        ) {

          member.childAllowanceEligible =
            false;

          member.isEducationContinuing =
            false;

          member.educationStartDate =
            undefined;

          member.educationEndDate =
            undefined;

          return;

        }


        /*
         * Cocuk egitime devam ediyorsa
         * okul ve egitim baslangic tarihi gerekir.
         *
         * 18 / 25 yas kuralini BURADA
         * hard-code etmiyoruz.
         * Bordro parametresine baglanacak.
         */

        if (
          member.isEducationContinuing ===
          true
        ) {

          if (
            !member.schoolName
          ) {

            throw new ApiError(
              400,
              `${index + 1}. cocuk kaydinda egitime devam ediyorsa okul adi zorunludur.`
            );

          }


          if (
            !member.educationStartDate
          ) {

            throw new ApiError(
              400,
              `${index + 1}. cocuk kaydinda egitime devam ediyorsa egitim baslangic tarihi zorunludur.`
            );

          }


          member.educationEndDate =
            undefined;

        }


        if (
          member.educationStartDate &&
          member.educationEndDate &&
          new Date(
            member.educationEndDate
          ) <
            new Date(
              member.educationStartDate
            )
        ) {

          throw new ApiError(
            400,
            `${index + 1}. cocuk kaydinda egitim bitis tarihi baslangic tarihinden once olamaz.`
          );

        }

      }
    );

  }


  /* ----------------------------------------------------------
     ACIL DURUM
  ---------------------------------------------------------- */

  if (
    data.emergencyContacts !==
      undefined
  ) {

    if (
      data.emergencyContacts.length <
      1
    ) {

      throw new ApiError(
        400,
        'En az bir acil durum kisisi eklemelisiniz.'
      );

    }


    /*
     * Birden fazla kisi varsa bir tanesi
     * ana kisi olabilir.
     *
     * Hic ana secilmediyse ilk kisi otomatik ana.
     */

    const primaryCount =
      data.emergencyContacts.filter(
        item =>
          item.isPrimary === true
      ).length;


    if (
      primaryCount === 0 &&
      data.emergencyContacts.length
    ) {

      data.emergencyContacts[0]
        .isPrimary =
          true;

    }


    if (
      primaryCount > 1
    ) {

      throw new ApiError(
        400,
        'Yalnizca bir acil durum kisisi Ana Kisi olarak secilebilir.'
      );

    }

  }

}


/* ============================================================
   FULL NAME
============================================================ */

function buildFullName(
  firstName,
  lastName
) {

  return [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

}


/* ============================================================
   OTOMATIK SICIL
============================================================ */

/*
 * 1  => 00000001
 * 25 => 00000025
 *
 * Sicil:
 * - Sirket bazlidir.
 * - Otomatiktir.
 * - Degistirilemez.
 * - Isten ayrilan personelin uzerinde kalir.
 * - Tekrar kullanilmaz.
 */

async function allocateRegistryNo(
  tx,
  companyId
) {

  let sequence =
    await tx
      .employeeRegistrySequence
      .findUnique({

        where: {
          companyId,
        },

      });


  /*
   * Ilk defa sayaç aciliyorsa
   * mevcut en buyuk sicilden devam et.
   */

  if (!sequence) {

    const lastEmployee =
      await tx.employee.findFirst({

        where: {
          companyId,
        },

        orderBy: {
          registryNo:
            'desc',
        },

        select: {
          registryNo:
            true,
        },

      });


    let highestNumber =
      0;


    if (
      lastEmployee &&
      /^\d{8}$/.test(
        lastEmployee.registryNo
      )
    ) {

      highestNumber =
        Number(
          lastEmployee.registryNo
        ) || 0;

    }


    const numberToUse =
      highestNumber + 1;


    await tx
      .employeeRegistrySequence
      .create({

        data: {

          companyId,

          nextNumber:
            numberToUse + 1,

        },

      });


    return String(
      numberToUse
    ).padStart(
      8,
      '0'
    );

  }


  const numberToUse =
    sequence.nextNumber;


  await tx
    .employeeRegistrySequence
    .update({

      where: {
        companyId,
      },

      data: {

        nextNumber: {
          increment: 1,
        },

      },

    });


  return String(
    numberToUse
  ).padStart(
    8,
    '0'
  );

}


/* ============================================================
   MASTER DATA VALIDATION
============================================================ */

async function validateMasterData(
  data,
  companyId,
  client = prisma
) {

  /* ----------------------------------------------------------
     DEPARTMAN
  ---------------------------------------------------------- */

  if (
    data.departmentId
  ) {

    const department =
      await client
        .department
        .findFirst({

          where: {

            id:
              data.departmentId,

            companyId,

          },

          select: {
            id: true,
          },

        });


    if (!department) {

      throw new ApiError(
        400,
        'Secilen departman bulunamadi.'
      );

    }

  }


  /* ----------------------------------------------------------
     YONETICI
  ---------------------------------------------------------- */

  if (
    data.managerId
  ) {

    const manager =
      await client
        .employee
        .findFirst({

          where: {

            id:
              data.managerId,

            companyId,

          },

          select: {
            id: true,
          },

        });


    if (!manager) {

      throw new ApiError(
        400,
        'Secilen yonetici bulunamadi.'
      );

    }

  }


  /* ----------------------------------------------------------
     MESLEK KODU
  ---------------------------------------------------------- */

  if (
    data.occupationCode
  ) {

    const occupation =
      await client
        .occupation
        .findUnique({

          where: {
            code:
              data.occupationCode,
          },

        });


    if (
      !occupation ||
      !occupation.isActive
    ) {

      throw new ApiError(
        400,
        'Secilen meslek kodu bulunamadi veya aktif degil.'
      );

    }

  }


  /* ----------------------------------------------------------
     SGK BELGE TURU
  ---------------------------------------------------------- */

  if (
    data.sgkDocumentTypeCode
  ) {

    const documentType =
      await client
        .sgkDocumentType
        .findUnique({

          where: {
            code:
              data
                .sgkDocumentTypeCode,
          },

        });


    if (
      !documentType ||
      !documentType.isActive
    ) {

      throw new ApiError(
        400,
        'Secilen SGK belge turu bulunamadi veya aktif degil.'
      );

    }

  }


  /* ----------------------------------------------------------
     TESVIK / KANUN
  ---------------------------------------------------------- */

  if (
    data.incentiveCode
  ) {

    const incentive =
      await client
        .incentiveLaw
        .findUnique({

          where: {
            code:
              data.incentiveCode,
          },

        });


    if (
      !incentive ||
      !incentive.isActive
    ) {

      throw new ApiError(
        400,
        'Secilen tesvik / kanun kodu bulunamadi veya aktif degil.'
      );

    }

  }


  /* ----------------------------------------------------------
     BANKALAR
  ---------------------------------------------------------- */

  if (
    data.bankAccounts &&
    data.bankAccounts.length
  ) {

    const bankIds =
      [
        ...new Set(
          data.bankAccounts.map(
            account =>
              account.bankId
          )
        ),
      ];


    const banks =
      await client
        .bank
        .findMany({

          where: {

            id: {
              in:
                bankIds,
            },

            isActive:
              true,

          },

          select: {
            id: true,
          },

        });


    if (
      banks.length !==
      bankIds.length
    ) {

      throw new ApiError(
        400,
        'Secilen banka kayitlarindan biri bulunamadi veya aktif degil.'
      );

    }

  }

}


/* ============================================================
   PERSONEL IMPORT - V2
   DINAMIK ORGANIZASYON + OTOMATIK POZISYON
============================================================ */

/*
 * Yeni import mantigi:
 *
 * 1) Pozisyon Kodu doluysa:
 *    - Mevcut aktif ve bos pozisyon bulunur.
 *    - Personel o pozisyona atanir.
 *
 * 2) Pozisyon Kodu bos ise:
 *    - Pozisyon Adi + Organizasyon Birimi Kodu zorunludur.
 *    - Sistem 900000xx kodunu otomatik uretir.
 *    - Pozisyonu ilgili OrganizationUnit altinda olusturur.
 *    - Birim yoneticisi ise OrganizationUnit.managerPositionId atanir.
 *    - Birim yoneticisi degilse once kendi birim yoneticisine,
 *      yoksa ust birimlerdeki ilk yonetici pozisyonuna baglanir.
 *
 * 3) Birim yoneticisi ayni Excel dosyasinda yeni olusturuluyorsa:
 *    - Once yonetici pozisyonu ve yonetici personeli olusturulur.
 *    - Sonra ayni birimdeki diger personeller ona baglanir.
 *
 * Boylece personel organizasyonda sahipsiz kalmaz.
 */


const importRowSchema =
  z
    .object({

      nationalId:
        z
          .string()
          .regex(
            /^\d{11}$/,
            'T.C. kimlik numarasi 11 haneli olmalidir.'
          ),

      firstName:
        requiredText(
          'Ad alani zorunludur.'
        ),

      lastName:
        requiredText(
          'Soyad alani zorunludur.'
        ),

      birthDate:
        requiredDate,

      gender:
        z.enum([
          'FEMALE',
          'MALE',
          'UNSPECIFIED',
        ]),

      maritalStatus:
        z.enum([
          'SINGLE',
          'MARRIED',
          'DIVORCED',
          'WIDOWED',
          'UNSPECIFIED',
        ]),

      marriageDate:
        optionalDate,

      nationality:
        requiredText(
          'Uyruk zorunludur.'
        ),

      militaryStatus:
        z.enum([
          'NOT_APPLICABLE',
          'COMPLETED',
          'EXEMPT',
          'DEFERRED',
          'ACTIVE',
          'UNKNOWN',
        ]),

      militaryDefermentDate:
        optionalDate,

      phone:
        requiredText(
          'Telefon zorunludur.'
        ),

      email:
        optionalString,

      corporateEmail:
        optionalString,

      address:
        requiredText(
          'Adres zorunludur.'
        ),

      city:
        requiredText(
          'Sehir zorunludur.'
        ),

      country:
        requiredText(
          'Ulke zorunludur.'
        ),

      /*
       * Pozisyon kodu artik opsiyoneldir.
       * Bos ise sistem yeni pozisyon olusturur.
       */
      positionCode:
        optionalString,

      positionName:
        optionalString,

      organizationUnitCode:
        optionalString,

      parentPositionCode:
        optionalString,

      isUnitManager:
        z
          .boolean()
          .optional()
          .default(false),

      workLocation:
        requiredText(
          'Calisma yeri zorunludur.'
        ),

      collarType:
        z.enum([
          'WHITE_COLLAR',
          'BLUE_COLLAR',
          'OTHER',
        ]),

      occupationCode:
        requiredText(
          'Meslek kodu zorunludur.'
        ),

      hireDate:
        requiredDate,

      seniorityBaseDate:
        requiredDate,

      annualLeaveBaseDate:
        requiredDate,

      groupHireDate:
        requiredDate,

      contractType:
        z.enum([
          'INDEFINITE',
          'FIXED_TERM',
          'OTHER',
        ]),

      employmentType:
        z.enum([
          'FULL_TIME',
          'PART_TIME',
          'OTHER',
        ]),

      sgkDocumentTypeCode:
        requiredText(
          'SGK belge turu zorunludur.'
        ),

      incentiveCode:
        z
          .string()
          .trim()
          .optional(),

      isDisabled:
        requiredBoolean,

      disabilityRate:
        optionalNumber,

    })
    .superRefine(
      (
        data,
        ctx
      ) => {

        /*
         * Personel kartindaki kosullu kurallar import on kontrolde de
         * uygulanir. Boylece confirm asamasinda surpriz hata alinmaz.
         */
        if (
          data.maritalStatus ===
            'MARRIED' &&
          !data.marriageDate
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              'marriageDate',
            ],
            message:
              'Medeni durum Evli ise Evlilik Tarihi zorunludur.',
          });
        }

        if (
          data.militaryStatus ===
            'DEFERRED' &&
          !data.militaryDefermentDate
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              'militaryDefermentDate',
            ],
            message:
              'Askerlik durumu Tecilli ise Askerlik Tecil Tarihi zorunludur.',
          });
        }


        /*
         * Pozisyon kodu yoksa yeni pozisyon icin
         * Pozisyon Adi + Organizasyon Birimi Kodu gerekir.
         */
        if (
          !data.positionCode
        ) {

          if (
            !data.positionName
          ) {
            ctx.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                'positionName',
              ],
              message:
                'Pozisyon kodu bos ise Pozisyon Adi zorunludur.',
            });
          }

          if (
            !data.organizationUnitCode
          ) {
            ctx.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                'organizationUnitCode',
              ],
              message:
                'Pozisyon kodu bos ise Organizasyon Birimi Kodu zorunludur.',
            });
          }

        }

      }
    );


const IMPORT_COLUMN_MAP = {

  tckn:
    'nationalId',

  tc_kimlik_no:
    'nationalId',

  tc_kimlik_numarasi:
    'nationalId',

  ad:
    'firstName',

  soyad:
    'lastName',

  dogum_tarihi:
    'birthDate',

  cinsiyet:
    'gender',

  medeni_durum:
    'maritalStatus',

  evlilik_tarihi:
    'marriageDate',

  uyruk:
    'nationality',

  askerlik_durumu:
    'militaryStatus',

  askerlik_tecil_tarihi:
    'militaryDefermentDate',

  tecil_tarihi:
    'militaryDefermentDate',

  telefon:
    'phone',

  e_posta:
    'email',

  email:
    'email',

  kurumsal_e_posta:
    'corporateEmail',

  adres:
    'address',

  sehir:
    'city',

  ulke:
    'country',

  pozisyon_kodu:
    'positionCode',

  pozisyon_adi:
    'positionName',

  organizasyon_birimi_kodu:
    'organizationUnitCode',

  ust_pozisyon_kodu:
    'parentPositionCode',

  birim_yoneticisi_mi:
    'isUnitManager',

  calisma_yeri:
    'workLocation',

  yaka_turu:
    'collarType',

  meslek_kodu:
    'occupationCode',

  ise_giris_tarihi:
    'hireDate',

  kidem_baz_tarihi:
    'seniorityBaseDate',

  yillik_izin_baz_tarihi:
    'annualLeaveBaseDate',

  grup_ise_giris_tarihi:
    'groupHireDate',

  sozlesme_turu:
    'contractType',

  calisma_turu:
    'employmentType',

  sgk_belge_turu:
    'sgkDocumentTypeCode',

  tesvik_kanun_no:
    'incentiveCode',

  engelli_mi:
    'isDisabled',

  engellilik_orani:
    'disabilityRate',

};


const IMPORT_ENUM_MAPS = {

  gender: {
    KADIN:
      'FEMALE',
    FEMALE:
      'FEMALE',
    ERKEK:
      'MALE',
    MALE:
      'MALE',
    BELIRTILMEMIS:
      'UNSPECIFIED',
    UNSPECIFIED:
      'UNSPECIFIED',
  },

  maritalStatus: {
    BEKAR:
      'SINGLE',
    SINGLE:
      'SINGLE',
    EVLI:
      'MARRIED',
    MARRIED:
      'MARRIED',
    BOSANMIS:
      'DIVORCED',
    DIVORCED:
      'DIVORCED',
    DUL:
      'WIDOWED',
    WIDOWED:
      'WIDOWED',
    BELIRTILMEMIS:
      'UNSPECIFIED',
    UNSPECIFIED:
      'UNSPECIFIED',
  },

  militaryStatus: {
    UYGULANMAZ:
      'NOT_APPLICABLE',
    NOT_APPLICABLE:
      'NOT_APPLICABLE',
    TAMAMLANDI:
      'COMPLETED',
    COMPLETED:
      'COMPLETED',
    MUAF:
      'EXEMPT',
    EXEMPT:
      'EXEMPT',
    TECILLI:
      'DEFERRED',
    DEFERRED:
      'DEFERRED',
    AKTIF:
      'ACTIVE',
    ACTIVE:
      'ACTIVE',
    BILINMIYOR:
      'UNKNOWN',
    UNKNOWN:
      'UNKNOWN',
  },

  collarType: {
    BEYAZ_YAKA:
      'WHITE_COLLAR',
    WHITE_COLLAR:
      'WHITE_COLLAR',
    MAVI_YAKA:
      'BLUE_COLLAR',
    BLUE_COLLAR:
      'BLUE_COLLAR',
    DIGER:
      'OTHER',
    OTHER:
      'OTHER',
  },

  contractType: {
    BELIRSIZ_SURELI:
      'INDEFINITE',
    INDEFINITE:
      'INDEFINITE',
    BELIRLI_SURELI:
      'FIXED_TERM',
    FIXED_TERM:
      'FIXED_TERM',
    DIGER:
      'OTHER',
    OTHER:
      'OTHER',
  },

  employmentType: {
    TAM_ZAMANLI:
      'FULL_TIME',
    FULL_TIME:
      'FULL_TIME',
    YARI_ZAMANLI:
      'PART_TIME',
    PART_TIME:
      'PART_TIME',
    DIGER:
      'OTHER',
    OTHER:
      'OTHER',
  },

};


function normalizeImportHeader(
  value
) {

  return String(
    value ||
    ''
  )
    .trim()
    .toLocaleLowerCase(
      'tr-TR'
    )
    .replace(
      /[ç]/g,
      'c'
    )
    .replace(
      /[ğ]/g,
      'g'
    )
    .replace(
      /[ı]/g,
      'i'
    )
    .replace(
      /[ö]/g,
      'o'
    )
    .replace(
      /[ş]/g,
      's'
    )
    .replace(
      /[ü]/g,
      'u'
    )
    .replace(
      /[^a-z0-9]+/g,
      '_'
    )
    .replace(
      /^_+|_+$/g,
      ''
    );

}


function normalizeImportText(
  value
) {

  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return '';
  }

  if (
    typeof value ===
      'object' &&
    value.text
  ) {
    return String(
      value.text
    ).trim();
  }

  if (
    typeof value ===
      'object' &&
    Array.isArray(
      value.richText
    )
  ) {

    return value.richText
      .map(
        item =>
          item.text ||
          ''
      )
      .join(
        ''
      )
      .trim();

  }

  return String(
    value
  ).trim();

}


function normalizeSgkDocumentTypeCode(
  value
) {

  const raw =
    normalizeImportText(
      value
    );

  if (!raw) {
    return '';
  }

  if (
    /^\d+$/.test(
      raw
    )
  ) {
    return raw
      .padStart(
        2,
        '0'
      );
  }

  return raw;

}


function normalizeOptionalImportText(
  value
) {

  const raw =
    normalizeImportText(
      value
    );

  return raw ||
    undefined;

}


function normalizeImportBoolean(
  value
) {

  if (
    value ===
      true ||
    value ===
      false
  ) {
    return value;
  }

  const raw =
    normalizeImportText(
      value
    )
      .toLocaleUpperCase(
        'tr-TR'
      );

  if (
    [
      'EVET',
      'E',
      'YES',
      'Y',
      'TRUE',
      '1',
    ].includes(
      raw
    )
  ) {
    return true;
  }

  if (
    [
      'HAYIR',
      'H',
      'NO',
      'N',
      'FALSE',
      '0',
    ].includes(
      raw
    )
  ) {
    return false;
  }

  return value;

}


function normalizeImportDate(
  value
) {

  if (!value) {
    return value;
  }

  if (
    value instanceof
      Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      'number'
  ) {

    const excelEpoch =
      new Date(
        Date.UTC(
          1899,
          11,
          30
        )
      );

    return new Date(
      excelEpoch.getTime() +
      value *
        86400000
    );

  }

  const raw =
    normalizeImportText(
      value
    );

  const trMatch =
    raw.match(
      /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/
    );

  if (
    trMatch
  ) {
    return new Date(
      Date.UTC(
        Number(
          trMatch[3]
        ),
        Number(
          trMatch[2]
        ) -
          1,
        Number(
          trMatch[1]
        )
      )
    );
  }

  const result =
    new Date(
      raw
    );

  return Number.isNaN(
    result.getTime()
  )
    ? value
    : result;

}


function normalizeImportEnum(
  field,
  value
) {

  const raw =
    normalizeImportText(
      value
    );

  const key =
    raw
      .toLocaleUpperCase(
        'tr-TR'
      )
      .replace(
        /[Ç]/g,
        'C'
      )
      .replace(
        /[Ğ]/g,
        'G'
      )
      .replace(
        /[İI]/g,
        'I'
      )
      .replace(
        /[Ö]/g,
        'O'
      )
      .replace(
        /[Ş]/g,
        'S'
      )
      .replace(
        /[Ü]/g,
        'U'
      )
      .replace(
        /[^A-Z0-9]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      );

  return (
    IMPORT_ENUM_MAPS[
      field
    ]?.[
      key
    ] ||
    raw
  );

}


function mapImportArrayRow(
  rowValues,
  headerMap
) {

  const rawData = {};


  for (
    const [
      columnIndex,
      field
    ] of headerMap.entries()
  ) {

    rawData[
      field
    ] =
      rowValues[
        columnIndex
      ];

  }


  return {

    nationalId:
      normalizeImportText(
        rawData.nationalId
      ),

    firstName:
      normalizeImportText(
        rawData.firstName
      ),

    lastName:
      normalizeImportText(
        rawData.lastName
      ),

    birthDate:
      normalizeImportDate(
        rawData.birthDate
      ),

    gender:
      normalizeImportEnum(
        'gender',
        rawData.gender
      ),

    maritalStatus:
      normalizeImportEnum(
        'maritalStatus',
        rawData.maritalStatus
      ),

    marriageDate:
      normalizeImportDate(
        rawData.marriageDate
      ) ||
      undefined,

    nationality:
      normalizeImportText(
        rawData.nationality
      ),

    militaryStatus:
      normalizeImportEnum(
        'militaryStatus',
        rawData.militaryStatus
      ),

    militaryDefermentDate:
      normalizeImportDate(
        rawData.militaryDefermentDate
      ) ||
      undefined,

    phone:
      normalizeImportText(
        rawData.phone
      ),

    email:
      normalizeImportText(
        rawData.email
      ) ||
      undefined,

    corporateEmail:
      normalizeImportText(
        rawData.corporateEmail
      ) ||
      undefined,

    address:
      normalizeImportText(
        rawData.address
      ),

    city:
      normalizeImportText(
        rawData.city
      ),

    country:
      normalizeImportText(
        rawData.country
      ),

    positionCode:
      normalizeOptionalImportText(
        rawData.positionCode
      ),

    positionName:
      normalizeOptionalImportText(
        rawData.positionName
      ),

    organizationUnitCode:
      normalizeOptionalImportText(
        rawData.organizationUnitCode
      ),

    parentPositionCode:
      normalizeOptionalImportText(
        rawData.parentPositionCode
      ),

    isUnitManager:
      normalizeImportBoolean(
        rawData.isUnitManager
      ) ===
      true,

    workLocation:
      normalizeImportText(
        rawData.workLocation
      ),

    collarType:
      normalizeImportEnum(
        'collarType',
        rawData.collarType
      ),

    occupationCode:
      normalizeImportText(
        rawData.occupationCode
      ),

    hireDate:
      normalizeImportDate(
        rawData.hireDate
      ),

    seniorityBaseDate:
      normalizeImportDate(
        rawData.seniorityBaseDate
      ),

    annualLeaveBaseDate:
      normalizeImportDate(
        rawData.annualLeaveBaseDate
      ),

    groupHireDate:
      normalizeImportDate(
        rawData.groupHireDate
      ),

    contractType:
      normalizeImportEnum(
        'contractType',
        rawData.contractType
      ),

    employmentType:
      normalizeImportEnum(
        'employmentType',
        rawData.employmentType
      ),

    sgkDocumentTypeCode:
      normalizeSgkDocumentTypeCode(
        rawData.sgkDocumentTypeCode
      ),

    incentiveCode:
      normalizeOptionalImportText(
        rawData.incentiveCode
      ),

    isDisabled:
      normalizeImportBoolean(
        rawData.isDisabled
      ),

    disabilityRate:
      normalizeImportText(
        rawData.disabilityRate
      ) ||
      undefined,

  };

}


function makeImportError(
  rowNumber,
  field,
  message
) {

  return {
    rowNumber,
    field,
    message,
  };

}


async function resolveImportStaticReferences(
  data,
  companyId,
  client = prisma
) {

  const [
    occupation,
    sgkDocumentType,
    incentive,
  ] =
    await Promise.all([

      client.occupation.findUnique({
        where: {
          code:
            data.occupationCode,
        },
      }),

      client.sgkDocumentType.findUnique({
        where: {
          code:
            data.sgkDocumentTypeCode,
        },
      }),

      data.incentiveCode
        ? client.incentiveLaw.findUnique({
            where: {
              code:
                data.incentiveCode,
            },
          })
        : Promise.resolve(
            null
          ),

    ]);

  return {
    occupation,
    sgkDocumentType,
    incentive,
  };

}


async function findOrganizationUnitByCode(
  companyId,
  code,
  client = prisma
) {

  if (!code) {
    return null;
  }

  return client.organizationUnit.findFirst({
    where: {
      companyId,
      code,
      isActive:
        true,
    },

    include: {
      type:
        true,

      managerPosition: {
        include: {
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

      parentUnit: {
        select: {
          id:
            true,
          code:
            true,
          name:
            true,
          parentUnitId:
            true,
          managerPositionId:
            true,
        },
      },
    },
  });

}


async function findPositionByCode(
  companyId,
  code,
  client = prisma
) {

  if (!code) {
    return null;
  }

  return client.position.findFirst({
    where: {
      companyId,
      positionCode:
        code,
      isActive:
        true,
    },

    include: {
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

      organizationUnit: {
        select: {
          id:
            true,
          code:
            true,
          name:
            true,
          parentUnitId:
            true,
          managerPositionId:
            true,
        },
      },
    },
  });

}


async function findNearestUnitManagerPosition(
  companyId,
  organizationUnit,
  {
    includeCurrentUnit = true,
    client = prisma,
  } = {}
) {

  if (
    !organizationUnit
  ) {
    return null;
  }

  let current =
    organizationUnit;

  const visited =
    new Set();

  if (
    !includeCurrentUnit
  ) {

    if (
      !current.parentUnitId
    ) {
      return null;
    }

    current =
      await client.organizationUnit.findFirst({
        where: {
          id:
            current.parentUnitId,
          companyId,
          isActive:
            true,
        },
      });

  }


  while (
    current
  ) {

    if (
      visited.has(
        current.id
      )
    ) {
      throw new ApiError(
        400,
        'Organizasyon birimi hiyerarsisinda dongu tespit edildi.'
      );
    }

    visited.add(
      current.id
    );


    if (
      current.managerPositionId
    ) {

      const managerPosition =
        await client.position.findFirst({
          where: {
            id:
              current.managerPositionId,
            companyId,
            isActive:
              true,
          },

          include: {
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
        });


      if (
        managerPosition
      ) {
        return managerPosition;
      }

    }


    if (
      !current.parentUnitId
    ) {
      break;
    }


    current =
      await client.organizationUnit.findFirst({
        where: {
          id:
            current.parentUnitId,
          companyId,
          isActive:
            true,
        },
      });

  }


  return null;

}


async function allocateImportPositionCode(
  tx,
  companyId
) {

  let sequence =
    await tx.positionSequence.findUnique({
      where: {
        companyId,
      },
    });


  if (
    !sequence
  ) {

    const lastItem =
      await tx.position.findFirst({
        where: {
          companyId,
        },

        orderBy: {
          positionCode:
            'desc',
        },

        select: {
          positionCode:
            true,
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
        Number.isFinite(
          lastNumber
        ) &&
        lastNumber >=
          90000001
      ) {
        nextNumber =
          lastNumber +
          1;
      }

    }


    await tx.positionSequence.create({
      data: {
        companyId,
        nextNumber:
          nextNumber +
          1,
      },
    });


    return String(
      nextNumber
    );

  }


  const numberToUse =
    sequence.nextNumber;


  await tx.positionSequence.update({
    where: {
      companyId,
    },

    data: {
      nextNumber: {
        increment:
          1,
      },
    },
  });


  return String(
    numberToUse
  );

}


function buildImportEmployeeData(
  data,
  {
    positionName,
    positionMasterId,
    managerId,
  }
) {

  return {

    nationalId:
      data.nationalId,

    firstName:
      data.firstName,

    lastName:
      data.lastName,

    birthDate:
      data.birthDate,

    gender:
      data.gender,

    maritalStatus:
      data.maritalStatus,

    marriageDate:
      data.maritalStatus ===
        'MARRIED'
        ? data.marriageDate
        : null,

    nationality:
      data.nationality,

    militaryStatus:
      data.militaryStatus,

    militaryDefermentDate:
      data.militaryStatus ===
        'DEFERRED'
        ? data.militaryDefermentDate
        : null,

    phone:
      data.phone,

    email:
      data.email,

    corporateEmail:
      data.corporateEmail,

    address:
      data.address,

    city:
      data.city,

    country:
      data.country,

    /*
     * Legacy departmentId bos kalir.
     * Organizasyon Position -> OrganizationUnit uzerinden gelir.
     */
    departmentId:
      null,

    position:
      positionName,

    positionMasterId,

    workLocation:
      data.workLocation,

    collarType:
      data.collarType,

    managerId:
      managerId ||
      null,

    occupationCode:
      data.occupationCode,

    hireDate:
      data.hireDate,

    firstHireDate:
      data.hireDate,

    seniorityBaseDate:
      data.seniorityBaseDate,

    annualLeaveBaseDate:
      data.annualLeaveBaseDate,

    groupHireDate:
      data.groupHireDate,

    contractType:
      data.contractType,

    employmentType:
      data.employmentType,

    sgkDocumentTypeCode:
      data.sgkDocumentTypeCode,

    incentiveCode:
      data.incentiveCode ||
      null,

    isDisabled:
      data.isDisabled,

    disabilityRate:
      data.isDisabled
        ? data.disabilityRate
        : null,

  };

}


async function validateImportRowCore(
  {
    data,
    rowNumber,
    companyId,
    seenNationalIds,
    plannedUnitManagers,
  }
) {

  const errors =
    [];

  const parsed =
    importRowSchema.safeParse(
      data
    );


  if (
    !parsed.success
  ) {

    for (
      const issue
      of parsed.error.issues
    ) {

      errors.push(
        makeImportError(
          rowNumber,
          issue.path.join(
            '.'
          ) ||
          'row',
          issue.message
        )
      );

    }

  }


  if (
    data.nationalId &&
    seenNationalIds.has(
      data.nationalId
    )
  ) {

    errors.push(
      makeImportError(
        rowNumber,
        'nationalId',
        'Ayni Excel dosyasinda bu T.C. kimlik numarasi birden fazla kez kullanilmis.'
      )
    );

  }


  if (
    data.nationalId
  ) {
    seenNationalIds.add(
      data.nationalId
    );
  }


  const duplicateEmployee =
    data.nationalId
      ? await prisma.employee.findFirst({
          where: {
            companyId,
            nationalId:
              data.nationalId,
          },

          select: {
            registryNo:
              true,
            fullName:
              true,
            status:
              true,
          },
        })
      : null;


  if (
    duplicateEmployee
  ) {

    errors.push(
      makeImportError(
        rowNumber,
        'nationalId',
        `Bu T.C. kimlik numarasi ${duplicateEmployee.registryNo} sicil numarasi ile sistemde kayitli.`
      )
    );

  }


  let position =
    null;

  let organizationUnit =
    null;

  let parentPosition =
    null;

  let positionWillBeCreated =
    false;


  if (
    parsed.success
  ) {

    const validData =
      parsed.data;

    const staticReferences =
      await resolveImportStaticReferences(
        validData,
        companyId
      );


    if (
      !staticReferences.occupation ||
      !staticReferences.occupation.isActive
    ) {

      errors.push(
        makeImportError(
          rowNumber,
          'occupationCode',
          `Meslek kodu ${validData.occupationCode} sistemde bulunamadi veya aktif degil.`
        )
      );

    }


    if (
      !staticReferences.sgkDocumentType ||
      !staticReferences.sgkDocumentType.isActive
    ) {

      errors.push(
        makeImportError(
          rowNumber,
          'sgkDocumentTypeCode',
          `SGK belge turu ${validData.sgkDocumentTypeCode} sistemde bulunamadi veya aktif degil.`
        )
      );

    }


    if (
      validData.incentiveCode &&
      (
        !staticReferences.incentive ||
        !staticReferences.incentive.isActive
      )
    ) {

      errors.push(
        makeImportError(
          rowNumber,
          'incentiveCode',
          `Tesvik / Kanun No ${validData.incentiveCode} sistemde bulunamadi veya aktif degil.`
        )
      );

    }


    /*
     * MEVCUT POZISYON
     */
    if (
      validData.positionCode
    ) {

      position =
        await findPositionByCode(
          companyId,
          validData.positionCode
        );


      if (
        !position
      ) {

        errors.push(
          makeImportError(
            rowNumber,
            'positionCode',
            `Pozisyon kodu ${validData.positionCode} sistemde bulunamadi veya aktif degil. Kodu bos birakirsaniz sistem yeni pozisyon olusturabilir.`
          )
        );

      }
      else if (
        position.employee
      ) {

        errors.push(
          makeImportError(
            rowNumber,
            'positionCode',
            `Bu pozisyon ${position.employee.registryNo} - ${position.employee.fullName} personeline atanmis.`
          )
        );

      }


      if (
        position &&
        validData.organizationUnitCode &&
        position.organizationUnit?.code !==
          validData.organizationUnitCode
      ) {

        errors.push(
          makeImportError(
            rowNumber,
            'organizationUnitCode',
            `Pozisyon ${validData.positionCode}, ${position.organizationUnit?.code || '-'} organizasyon birimine bagli. Excel'deki ${validData.organizationUnitCode} ile uyusmuyor.`
          )
        );

      }

    }

    /*
     * YENI POZISYON
     */
    else {

      positionWillBeCreated =
        true;

      organizationUnit =
        await findOrganizationUnitByCode(
          companyId,
          validData.organizationUnitCode
        );


      if (
        !organizationUnit
      ) {

        errors.push(
          makeImportError(
            rowNumber,
            'organizationUnitCode',
            `Organizasyon birimi ${validData.organizationUnitCode || '-'} sistemde bulunamadi veya aktif degil.`
          )
        );

      }


      if (
        organizationUnit
      ) {

        if (
          validData.parentPositionCode
        ) {

          parentPosition =
            await findPositionByCode(
              companyId,
              validData.parentPositionCode
            );


          if (
            !parentPosition
          ) {

            errors.push(
              makeImportError(
                rowNumber,
                'parentPositionCode',
                `Ust pozisyon ${validData.parentPositionCode} sistemde bulunamadi veya aktif degil.`
              )
            );

          }

        }


        /*
         * Birim yoneticisi:
         * - Birimde zaten baska yonetici pozisyonu varsa hata.
         * - Ust pozisyon verilmediyse ust organizasyon biriminin
         *   ilk yonetici pozisyonuna baglanir.
         */
        if (
          validData.isUnitManager
        ) {

          if (
            organizationUnit.managerPositionId
          ) {

            errors.push(
              makeImportError(
                rowNumber,
                'isUnitManager',
                `${organizationUnit.code} - ${organizationUnit.name} biriminin yonetici pozisyonu zaten tanimli.`
              )
            );

          }


          if (
            !parentPosition &&
            organizationUnit.parentUnitId
          ) {

            parentPosition =
              await findNearestUnitManagerPosition(
                companyId,
                organizationUnit,
                {
                  includeCurrentUnit:
                    false,
                }
              );

            /*
             * Ust birimlerde mevcut manager bulunmuyor olabilir,
             * fakat ayni Excel'de ust birim yoneticisi planlanmissa
             * preview bunu kabul eder.
             */
            if (
              !parentPosition
            ) {

              let parentUnitId =
                organizationUnit.parentUnitId;

              let plannedParentFound =
                false;

              const visited =
                new Set();


              while (
                parentUnitId
              ) {

                if (
                  visited.has(
                    parentUnitId
                  )
                ) {
                  break;
                }

                visited.add(
                  parentUnitId
                );


                const parentUnit =
                  await prisma.organizationUnit.findFirst({
                    where: {
                      id:
                        parentUnitId,
                      companyId,
                      isActive:
                        true,
                    },

                    select: {
                      id:
                        true,
                      code:
                        true,
                      parentUnitId:
                        true,
                    },
                  });


                if (
                  !parentUnit
                ) {
                  break;
                }


                if (
                  plannedUnitManagers.has(
                    parentUnit.code
                  )
                ) {
                  plannedParentFound =
                    true;
                  break;
                }


                parentUnitId =
                  parentUnit.parentUnitId;

              }


              if (
                !plannedParentFound
              ) {

                errors.push(
                  makeImportError(
                    rowNumber,
                    'parentPositionCode',
                    `${organizationUnit.code} - ${organizationUnit.name} biriminin ust organizasyon zincirinde yonetici pozisyonu bulunamadi. Once ust birim yoneticisini tanimlayin veya Excel'de Ust Pozisyon Kodu girin.`
                  )
                );

              }

            }

          }

        }

        /*
         * Normal pozisyon:
         * - Acikca ust pozisyon verilmediyse kendi birim yoneticisine,
         * - yoksa ayni Excel'de planlanan birim yoneticisine,
         * - yoksa ust birim yoneticisine baglanir.
         */
        else if (
          !parentPosition
        ) {

          if (
            organizationUnit.managerPosition
          ) {

            parentPosition =
              organizationUnit.managerPosition;

          }
          else if (
            plannedUnitManagers.has(
              organizationUnit.code
            )
          ) {

            /*
             * Preview'da henuz DB pozisyonu yok.
             * Sanal parent bilgisi uretiyoruz.
             */
            const planned =
              plannedUnitManagers.get(
                organizationUnit.code
              );

            parentPosition = {
              id:
                null,
              positionCode:
                'OTOMATIK',
              name:
                planned.positionName,
              planned:
                true,
            };

          }
          else {

            parentPosition =
              await findNearestUnitManagerPosition(
                companyId,
                organizationUnit,
                {
                  includeCurrentUnit:
                    false,
                }
              );


            if (
              !parentPosition &&
              organizationUnit.parentUnitId
            ) {

              errors.push(
                makeImportError(
                  rowNumber,
                  'parentPositionCode',
                  `${organizationUnit.code} - ${organizationUnit.name} birimi icin baglanacak bir yonetici pozisyonu bulunamadi. Excel'e birim yoneticisi satiri ekleyin veya Ust Pozisyon Kodu girin.`
                )
              );

            }

          }

        }

      }

    }

  }


  const previewPosition =
    position
      ? {
          id:
            position.id,
          positionCode:
            position.positionCode,
          name:
            position.name,
          willCreate:
            false,
        }
      : positionWillBeCreated
        ? {
            id:
              null,
            positionCode:
              'OTOMATIK',
            name:
              parsed.success
                ? parsed.data.positionName
                : data.positionName,
            willCreate:
              true,
          }
        : null;


  return {

    rowNumber,

    data:
      parsed.success
        ? parsed.data
        : data,

    position:
      previewPosition,

    organizationUnit:
      organizationUnit
        ? {
            id:
              organizationUnit.id,
            code:
              organizationUnit.code,
            name:
              organizationUnit.name,
            type:
              organizationUnit.type?.name ||
              null,
          }
        : position?.organizationUnit
          ? {
              id:
                position.organizationUnit.id,
              code:
                position.organizationUnit.code,
              name:
                position.organizationUnit.name,
              type:
                null,
            }
          : null,

    parentPosition:
      parentPosition
        ? {
            id:
              parentPosition.id ||
              null,
            positionCode:
              parentPosition.positionCode,
            name:
              parentPosition.name,
            planned:
              Boolean(
                parentPosition.planned
              ),
          }
        : null,

    errors,

    isValid:
      errors.length ===
      0,

  };

}


async function previewImport(
  req,
  res
) {

  if (
    !req.file ||
    !req.file.buffer
  ) {

    return res
      .status(
        400
      )
      .json({

        success:
          false,

        message:
          'Excel dosyasi backend tarafina ulasmadi.',

        data: {

          fatalError: {
            field:
              'DOSYA',
            message:
              'Excel dosyasi backend tarafina ulasmadi.',
            technicalDetail:
              'req.file veya req.file.buffer bos. employee.routes.js icinde upload.single("file") bulunmalidir.',
          },

        },

      });

  }


  let workbook;


  try {

    workbook =
      XLSX.read(
        Buffer.from(
          req.file.buffer
        ),
        {
          type:
            'buffer',
          cellDates:
            true,
          cellText:
            false,
        }
      );

  }
  catch(error) {

    console.error(
      '[EMPLOYEE_IMPORT_XLSX_READ_ERROR]',
      error
    );

    return res
      .status(
        400
      )
      .json({

        success:
          false,

        message:
          `Excel dosyasi okunamadi: ${error.message}`,

        data: {

          fatalError: {
            field:
              'DOSYA',
            message:
              'Excel dosyasi okunamadi.',
            technicalDetail:
              `${error.name || 'Error'}: ${error.message}`,
          },

        },

      });

  }


  const firstSheetName =
    workbook.SheetNames?.[
      0
    ];


  if (
    !firstSheetName
  ) {

    throw new ApiError(
      400,
      'Excel dosyasinda calisma sayfasi bulunamadi.'
    );

  }


  const worksheet =
    workbook.Sheets[
      firstSheetName
    ];


  const rawRows =
    XLSX.utils.sheet_to_json(
      worksheet,
      {
        header:
          1,
        raw:
          true,
        defval:
          '',
        blankrows:
          false,
      }
    );


  if (
    !rawRows.length
  ) {

    throw new ApiError(
      400,
      'Excel dosyasi bos.'
    );

  }


  const headerRow =
    rawRows[
      0
    ] ||
    [];


  const headerMap =
    new Map();


  headerRow.forEach(
    (
      value,
      columnIndex
    ) => {

      const normalized =
        normalizeImportHeader(
          value
        );

      const field =
        IMPORT_COLUMN_MAP[
          normalized
        ];


      if (
        field
      ) {
        headerMap.set(
          columnIndex,
          field
        );
      }

    }
  );


  /*
   * Pozisyon Kodu kolonu artik zorunlu degil.
   * Ancak yeni pozisyon olusturma icin Pozisyon Adi ve
   * Organizasyon Birimi Kodu kolonlari sablonda bulunur.
   */
  const requiredFields = [

    'nationalId',
    'firstName',
    'lastName',
    'birthDate',
    'gender',
    'maritalStatus',
    'marriageDate',
    'nationality',
    'militaryStatus',
    'militaryDefermentDate',
    'phone',
    'address',
    'city',
    'country',

    'positionName',
    'organizationUnitCode',

    'workLocation',
    'collarType',
    'occupationCode',
    'hireDate',
    'seniorityBaseDate',
    'annualLeaveBaseDate',
    'groupHireDate',
    'contractType',
    'employmentType',
    'sgkDocumentTypeCode',
    'isDisabled',

  ];


  const mappedFields =
    new Set(
      headerMap.values()
    );


  const missingFields =
    requiredFields.filter(
      field =>
        !mappedFields.has(
          field
        )
    );


  if (
    missingFields.length
  ) {

    throw new ApiError(
      400,
      `Excel sablonunda zorunlu kolonlar eksik: ${missingFields.join(', ')}`
    );

  }


  const normalizedRows =
    [];


  for (
    let rowIndex = 1;
    rowIndex <
      rawRows.length;
    rowIndex += 1
  ) {

    const rowValues =
      rawRows[
        rowIndex
      ] ||
      [];


    const hasAnyValue =
      rowValues.some(
        value =>
          normalizeImportText(
            value
          ) !==
          ''
      );


    if (
      !hasAnyValue
    ) {
      continue;
    }


    normalizedRows.push({

      rowNumber:
        rowIndex +
        1,

      data:
        mapImportArrayRow(
          rowValues,
          headerMap
        ),

    });

  }


  /*
   * Ayni Excel'de hangi birimlere yeni yonetici
   * pozisyonu gelecegini once belirliyoruz.
   */
  const plannedUnitManagers =
    new Map();


  for (
    const row
    of normalizedRows
  ) {

    const data =
      row.data;

    if (
      !data.positionCode &&
      data.isUnitManager &&
      data.organizationUnitCode
    ) {

      if (
        plannedUnitManagers.has(
          data.organizationUnitCode
        )
      ) {

        const first =
          plannedUnitManagers.get(
            data.organizationUnitCode
          );

        row.preError =
          `Ayni organizasyon birimi icin birden fazla yeni birim yoneticisi tanimlandi. Ilk satir: ${first.rowNumber}`;

      }
      else {

        plannedUnitManagers.set(
          data.organizationUnitCode,
          {
            rowNumber:
              row.rowNumber,
            positionName:
              data.positionName,
          }
        );

      }

    }

  }


  const seenNationalIds =
    new Set();

  const rows =
    [];


  for (
    const row
    of normalizedRows
  ) {

    try {

      const result =
        await validateImportRowCore({
          data:
            row.data,
          rowNumber:
            row.rowNumber,
          companyId:
            req.companyId,
          seenNationalIds,
          plannedUnitManagers,
        });


      if (
        row.preError
      ) {

        result.errors.push(
          makeImportError(
            row.rowNumber,
            'isUnitManager',
            row.preError
          )
        );

        result.isValid =
          false;

      }


      rows.push(
        result
      );

    }
    catch(error) {

      console.error(
        '[EMPLOYEE_IMPORT_ROW_ERROR]',
        {
          rowNumber:
            row.rowNumber,
          error,
        }
      );


      rows.push({

        rowNumber:
          row.rowNumber,

        data:
          row.data,

        position:
          null,

        errors: [
          makeImportError(
            row.rowNumber,
            'SYSTEM',
            `Sistem kontrolu yapilamadi: ${error.message || 'Bilinmeyen hata'}`
          ),
        ],

        isValid:
          false,

      });

    }

  }


  const validCount =
    rows.filter(
      row =>
        row.isValid
    ).length;


  const invalidCount =
    rows.length -
    validCount;


  return res.json({

    success:
      true,

    message:
      invalidCount >
        0
        ? `${invalidCount} satirda hata bulundu.`
        : 'Excel on kontrolu basariyla tamamlandi.',

    data: {

      fileName:
        req.file.originalname,

      sheetName:
        firstSheetName,

      totalRows:
        rows.length,

      validCount,

      invalidCount,

      autoPositionCount:
        rows.filter(
          row =>
            row.isValid &&
            row.position?.willCreate
        ).length,

      rows,

    },

  });

}


/* ============================================================
   IMPORT CONFIRM YARDIMCILARI
============================================================ */


async function getOrganizationUnitDepth(
  tx,
  companyId,
  unitId
) {

  let depth =
    0;

  let currentId =
    unitId;

  const visited =
    new Set();


  while (
    currentId
  ) {

    if (
      visited.has(
        currentId
      )
    ) {
      throw new ApiError(
        400,
        'Organizasyon hiyerarsisinda dongu tespit edildi.'
      );
    }

    visited.add(
      currentId
    );


    const unit =
      await tx.organizationUnit.findFirst({
        where: {
          id:
            currentId,
          companyId,
        },

        select: {
          parentUnitId:
            true,
        },
      });


    if (
      !unit ||
      !unit.parentUnitId
    ) {
      break;
    }


    depth +=
      1;

    currentId =
      unit.parentUnitId;

  }


  return depth;

}


async function resolvePositionParentForCreate(
  tx,
  companyId,
  {
    data,
    organizationUnit,
  }
) {

  /*
   * Acikca Ust Pozisyon Kodu verildiyse onu kullan.
   */
  if (
    data.parentPositionCode
  ) {

    const explicit =
      await findPositionByCode(
        companyId,
        data.parentPositionCode,
        tx
      );


    if (
      !explicit
    ) {
      throw new ApiError(
        400,
        `Ust pozisyon ${data.parentPositionCode} bulunamadi veya aktif degil.`
      );
    }


    return explicit;

  }


  /*
   * Birim yoneticisi kendi birim yoneticisine baglanamaz.
   * Bir ust organizasyon zincirindeki yonetici pozisyonuna cikar.
   */
  if (
    data.isUnitManager
  ) {

    return findNearestUnitManagerPosition(
      companyId,
      organizationUnit,
      {
        includeCurrentUnit:
          false,
        client:
          tx,
      }
    );

  }


  /*
   * Normal pozisyon kendi biriminin yonetici pozisyonuna,
   * yoksa ust organizasyon zincirindeki yoneticiye baglanir.
   */
  return findNearestUnitManagerPosition(
    companyId,
    organizationUnit,
    {
      includeCurrentUnit:
        true,
      client:
        tx,
    }
  );

}


async function resolveManagerEmployeeFromPosition(
  tx,
  companyId,
  position
) {

  let currentParentId =
    position.parentPositionId ||
    null;

  const visited =
    new Set();


  while (
    currentParentId
  ) {

    if (
      visited.has(
        currentParentId
      )
    ) {
      throw new ApiError(
        400,
        `Pozisyon hiyerarsisinda dongu tespit edildi: ${position.positionCode} - ${position.name}`
      );
    }

    visited.add(
      currentParentId
    );


    const parent =
      await tx.position.findFirst({
        where: {
          id:
            currentParentId,
          companyId,
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
      });


    if (
      !parent
    ) {
      throw new ApiError(
        400,
        `Pozisyonun ust pozisyon zinciri bulunamadi: ${position.positionCode} - ${position.name}`
      );
    }


    if (
      parent.employee
    ) {

      return {
        managerEmployee:
          parent.employee,

        managerPosition: {
          id:
            parent.id,
          positionCode:
            parent.positionCode,
          name:
            parent.name,
        },
      };

    }


    currentParentId =
      parent.parentPositionId ||
      null;

  }


  return {
    managerEmployee:
      null,
    managerPosition:
      null,
  };

}


async function confirmImport(
  req,
  res
) {

  const rows =
    Array.isArray(
      req.body?.rows
    )
      ? req.body.rows
      : [];


  if (
    rows.length <
    1
  ) {
    throw new ApiError(
      400,
      'Aktarilacak personel kaydi bulunamadi.'
    );
  }


  if (
    rows.length >
    1000
  ) {
    throw new ApiError(
      400,
      'Tek seferde en fazla 1000 personel aktarilabilir.'
    );
  }


  const parsedRows =
    [];

  const seenNationalIds =
    new Set();


  for (
    let index =
      0;
    index <
      rows.length;
    index +=
      1
  ) {

    const rowNumber =
      Number(
        rows[
          index
        ]?.rowNumber
      ) ||
      index +
        2;

    const rawData =
      rows[
        index
      ]?.data ||
      rows[
        index
      ];


    const parsed =
      importRowSchema.safeParse(
        rawData
      );


    if (
      !parsed.success
    ) {

      throw new ApiError(
        400,
        `${rowNumber}. satir gecersiz: ${parsed.error.issues
          .map(
            issue =>
              issue.message
          )
          .join(
            ' | '
          )}`
      );

    }


    const data =
      parsed.data;


    if (
      seenNationalIds.has(
        data.nationalId
      )
    ) {
      throw new ApiError(
        400,
        `${rowNumber}. satir: Ayni T.C. kimlik numarasi aktarim listesinde birden fazla kez bulunuyor.`
      );
    }


    seenNationalIds.add(
      data.nationalId
    );


    const [
      duplicateEmployee,
      staticReferences,
    ] =
      await Promise.all([

        prisma.employee.findFirst({
          where: {
            companyId:
              req.companyId,
            nationalId:
              data.nationalId,
          },

          select: {
            registryNo:
              true,
          },
        }),

        resolveImportStaticReferences(
          data,
          req.companyId
        ),

      ]);


    if (
      duplicateEmployee
    ) {
      throw new ApiError(
        409,
        `${rowNumber}. satir: Bu T.C. kimlik numarasi ${duplicateEmployee.registryNo} sicil numarasi ile sistemde kayitli.`
      );
    }


    if (
      !staticReferences.occupation ||
      !staticReferences.occupation.isActive
    ) {
      throw new ApiError(
        400,
        `${rowNumber}. satir: Meslek kodu ${data.occupationCode} bulunamadi veya aktif degil.`
      );
    }


    if (
      !staticReferences.sgkDocumentType ||
      !staticReferences.sgkDocumentType.isActive
    ) {
      throw new ApiError(
        400,
        `${rowNumber}. satir: SGK belge turu ${data.sgkDocumentTypeCode} bulunamadi veya aktif degil.`
      );
    }


    if (
      data.incentiveCode &&
      (
        !staticReferences.incentive ||
        !staticReferences.incentive.isActive
      )
    ) {
      throw new ApiError(
        400,
        `${rowNumber}. satir: Tesvik / Kanun No ${data.incentiveCode} bulunamadi veya aktif degil.`
      );
    }


    parsedRows.push({
      rowNumber,
      data,
    });

  }


  /*
   * Birim yoneticilerini birim bazinda tekille.
   */
  const managerRowsByUnit =
    new Map();


  for (
    const row
    of parsedRows
  ) {

    if (
      !row.data.positionCode &&
      row.data.isUnitManager
    ) {

      const code =
        row.data.organizationUnitCode;


      if (
        managerRowsByUnit.has(
          code
        )
      ) {
        throw new ApiError(
          400,
          `${row.rowNumber}. satir: ${code} organizasyon birimi icin birden fazla yeni birim yoneticisi tanimlandi.`
        );
      }


      managerRowsByUnit.set(
        code,
        row
      );

    }

  }


  const createdEmployees =
    await prisma.$transaction(
      async tx => {

        /*
         * Her satir icin pozisyon ve unit bilgisi hazirlanir.
         */
        const prepared =
          [];


        for (
          const row
          of parsedRows
        ) {

          const data =
            row.data;

          let position =
            null;

          let organizationUnit =
            null;

          let newPosition =
            false;


          if (
            data.positionCode
          ) {

            position =
              await findPositionByCode(
                req.companyId,
                data.positionCode,
                tx
              );


            if (
              !position
            ) {
              throw new ApiError(
                400,
                `${row.rowNumber}. satir: Pozisyon ${data.positionCode} bulunamadi veya aktif degil. Kodu bos birakip otomatik pozisyon olusturabilirsiniz.`
              );
            }


            if (
              position.employee
            ) {
              throw new ApiError(
                409,
                `${row.rowNumber}. satir: ${position.positionCode} - ${position.name} pozisyonu ${position.employee.registryNo} - ${position.employee.fullName} personeline atanmis.`
              );
            }


            organizationUnit =
              position.organizationUnit;


            if (
              data.organizationUnitCode &&
              organizationUnit?.code !==
                data.organizationUnitCode
            ) {
              throw new ApiError(
                400,
                `${row.rowNumber}. satir: Pozisyonun organizasyon birimi Excel ile uyusmuyor.`
              );
            }

          }
          else {

            organizationUnit =
              await findOrganizationUnitByCode(
                req.companyId,
                data.organizationUnitCode,
                tx
              );


            if (
              !organizationUnit
            ) {
              throw new ApiError(
                400,
                `${row.rowNumber}. satir: Organizasyon birimi ${data.organizationUnitCode} bulunamadi veya aktif degil.`
              );
            }


            if (
              data.isUnitManager &&
              organizationUnit.managerPositionId
            ) {
              throw new ApiError(
                409,
                `${row.rowNumber}. satir: ${organizationUnit.code} - ${organizationUnit.name} biriminin yonetici pozisyonu zaten tanimli.`
              );
            }


            newPosition =
              true;

          }


          const depth =
            organizationUnit
              ? await getOrganizationUnitDepth(
                  tx,
                  req.companyId,
                  organizationUnit.id
                )
              : 0;


          prepared.push({
            rowNumber:
              row.rowNumber,
            data,
            position,
            organizationUnit,
            newPosition,
            depth,
          });

        }


        /*
         * 1) Yeni BIRIM YONETICISI pozisyonlarini
         *    ustten alta dogru olustur.
         */
        const managerPositionRows =
          prepared
            .filter(
              item =>
                item.newPosition &&
                item.data.isUnitManager
            )
            .sort(
              (
                left,
                right
              ) =>
                left.depth -
                right.depth
            );


        for (
          const item
          of managerPositionRows
        ) {

          const parentPosition =
            await resolvePositionParentForCreate(
              tx,
              req.companyId,
              item
            );


          /*
           * Root olmayan bir birimde ust manager pozisyonu yoksa
           * organizasyon agacinda sahipsiz pozisyon olusturma.
           */
          if (
            item.organizationUnit.parentUnitId &&
            !parentPosition
          ) {
            throw new ApiError(
              400,
              `${item.rowNumber}. satir: ${item.organizationUnit.code} - ${item.organizationUnit.name} birim yoneticisi icin ust yonetici pozisyonu bulunamadi.`
            );
          }


          const positionCode =
            await allocateImportPositionCode(
              tx,
              req.companyId
            );


          item.position =
            await tx.position.create({
              data: {
                companyId:
                  req.companyId,
                positionCode,
                name:
                  item.data.positionName,
                organizationUnitId:
                  item.organizationUnit.id,
                parentPositionId:
                  parentPosition?.id ||
                  null,
                normCount:
                  1,
                isActive:
                  true,
              },

              include: {
                employee:
                  true,
                organizationUnit:
                  true,
              },
            });


          await tx.organizationUnit.update({
            where: {
              id:
                item.organizationUnit.id,
            },

            data: {
              managerPositionId:
                item.position.id,
            },
          });


          /*
           * Bellekteki unit objesini de guncelle ki
           * ayni batch'teki alt satirlar yeni manager'i gorebilsin.
           */
          item.organizationUnit.managerPositionId =
            item.position.id;

        }


        /*
         * 2) Mevcut pozisyon olup Excel'de Birim Yoneticisi Mi=EVET
         *    denilen satirlar varsa ilgili birimin manager'i yap.
         */
        const existingManagerRows =
          prepared
            .filter(
              item =>
                !item.newPosition &&
                item.data.isUnitManager
            )
            .sort(
              (
                left,
                right
              ) =>
                left.depth -
                right.depth
            );


        for (
          const item
          of existingManagerRows
        ) {

          if (
            !item.organizationUnit
          ) {
            throw new ApiError(
              400,
              `${item.rowNumber}. satir: Mevcut pozisyonun organizasyon birimi bulunamadi.`
            );
          }


          if (
            item.organizationUnit.managerPositionId &&
            item.organizationUnit.managerPositionId !==
              item.position.id
          ) {
            throw new ApiError(
              409,
              `${item.rowNumber}. satir: ${item.organizationUnit.code} - ${item.organizationUnit.name} biriminde farkli bir yonetici pozisyonu zaten tanimli.`
            );
          }


          await tx.organizationUnit.update({
            where: {
              id:
                item.organizationUnit.id,
            },

            data: {
              managerPositionId:
                item.position.id,
            },
          });

        }


        /*
         * 3) Yeni NORMAL pozisyonlari olustur.
         *    Bu noktada batch'teki manager pozisyonlari artik DB'de.
         */
        const normalNewRows =
          prepared.filter(
            item =>
              item.newPosition &&
              !item.data.isUnitManager
          );


        for (
          const item
          of normalNewRows
        ) {

          /*
           * Unit bilgisini managerPositionId guncel haliyle yeniden al.
           */
          item.organizationUnit =
            await tx.organizationUnit.findFirst({
              where: {
                id:
                  item.organizationUnit.id,
                companyId:
                  req.companyId,
                isActive:
                  true,
              },
            });


          const parentPosition =
            await resolvePositionParentForCreate(
              tx,
              req.companyId,
              item
            );


          if (
            item.organizationUnit.parentUnitId &&
            !parentPosition
          ) {
            throw new ApiError(
              400,
              `${item.rowNumber}. satir: ${item.organizationUnit.code} - ${item.organizationUnit.name} icin baglanacak yonetici pozisyonu bulunamadi.`
            );
          }


          const positionCode =
            await allocateImportPositionCode(
              tx,
              req.companyId
            );


          item.position =
            await tx.position.create({
              data: {
                companyId:
                  req.companyId,
                positionCode,
                name:
                  item.data.positionName,
                organizationUnitId:
                  item.organizationUnit.id,
                parentPositionId:
                  parentPosition?.id ||
                  null,
                normCount:
                  1,
                isActive:
                  true,
              },

              include: {
                employee:
                  true,
                organizationUnit:
                  true,
              },
            });

        }


        /*
         * 4) Personelleri olustur.
         *
         * Birim yoneticileri once olusturulur ki alt personeller
         * parentPosition.employee uzerinden managerId bulabilsin.
         */
        const orderedForEmployeeCreate =
          [
            ...prepared
              .filter(
                item =>
                  item.data.isUnitManager
              )
              .sort(
                (
                  left,
                  right
                ) =>
                  left.depth -
                  right.depth
              ),

            ...prepared
              .filter(
                item =>
                  !item.data.isUnitManager
              )
              .sort(
                (
                  left,
                  right
                ) =>
                  left.depth -
                  right.depth
              ),
          ];


        const created =
          [];


        for (
          const item
          of orderedForEmployeeCreate
        ) {

          /*
           * Preview -> confirm arasinda pozisyon dolmus olabilir.
           * Yeni pozisyonda employee zaten null olur.
           */
          const currentPosition =
            await tx.position.findFirst({
              where: {
                id:
                  item.position.id,
                companyId:
                  req.companyId,
                isActive:
                  true,
              },

              include: {
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
            });


          if (
            !currentPosition
          ) {
            throw new ApiError(
              400,
              `${item.rowNumber}. satir: Pozisyon kaydi bulunamadi veya pasif.`
            );
          }


          if (
            currentPosition.employee
          ) {
            throw new ApiError(
              409,
              `${item.rowNumber}. satir: ${currentPosition.positionCode} - ${currentPosition.name} pozisyonu artik dolu.`
            );
          }


          const managerContext =
            await resolveManagerEmployeeFromPosition(
              tx,
              req.companyId,
              currentPosition
            );


          /*
           * Ust pozisyon varsa ama ust zincirde henuz personel yoksa,
           * agac icinde sahipsiz personel yaratmayalim.
           */
          if (
            currentPosition.parentPositionId &&
            !managerContext.managerEmployee
          ) {
            throw new ApiError(
              400,
              `${item.rowNumber}. satir: ${currentPosition.positionCode} - ${currentPosition.name} pozisyonunun ust yonetici pozisyonunda personel bulunamadi.`
            );
          }


          const employeeData =
            buildImportEmployeeData(
              item.data,
              {
                positionName:
                  currentPosition.name,
                positionMasterId:
                  currentPosition.id,
                managerId:
                  managerContext.managerEmployee?.id ||
                  null,
              }
            );


          validateBusinessRules(
            employeeData
          );


          await validateMasterData(
            employeeData,
            req.companyId,
            tx
          );


          const registryNo =
            await allocateRegistryNo(
              tx,
              req.companyId
            );


          const employee =
            await tx.employee.create({
              data: {
                ...employeeData,
                companyId:
                  req.companyId,
                registryNo,
                fullName:
                  buildFullName(
                    employeeData.firstName,
                    employeeData.lastName
                  ),
                status:
                  'PROBATION',
              },

              select: {
                id:
                  true,
                registryNo:
                  true,
                nationalId:
                  true,
                fullName:
                  true,
                position:
                  true,
                positionMasterId:
                  true,
                managerId:
                  true,
              },
            });


          created.push({
            rowNumber:
              item.rowNumber,

            ...employee,

            positionMaster: {
              id:
                currentPosition.id,
              positionCode:
                currentPosition.positionCode,
              name:
                currentPosition.name,
              autoCreated:
                item.newPosition,
            },

            manager:
              managerContext.managerEmployee
                ? {
                    id:
                      managerContext.managerEmployee.id,
                    registryNo:
                      managerContext.managerEmployee.registryNo,
                    fullName:
                      managerContext.managerEmployee.fullName,
                    position:
                      managerContext.managerPosition,
                  }
                : null,

          });

        }


        /*
         * Kullaniciya Excel sirasinda donelim.
         */
        created.sort(
          (
            left,
            right
          ) =>
            left.rowNumber -
            right.rowNumber
        );


        return created;

      },
      {
        maxWait:
          10000,
        timeout:
          120000,
      }
    );


  const autoCreatedPositionCount =
    createdEmployees.filter(
      item =>
        item.positionMaster?.autoCreated
    ).length;


  res
    .status(
      201
    )
    .json({

      success:
        true,

      message:
        `${createdEmployees.length} personel basariyla aktarildi. ${autoCreatedPositionCount} yeni pozisyon otomatik olusturuldu.`,

      data: {

        createdCount:
          createdEmployees.length,

        autoCreatedPositionCount,

        employees:
          createdEmployees,

      },

    });

}


/* ============================================================
   LIST
============================================================ */

async function list(
  req,
  res
) {

  const {

    search,

    departmentId,

    status,

    page = '1',

    pageSize = '20',

  } = req.query;


  const where = {

    companyId:
      req.companyId,


    ...(departmentId && {
      departmentId,
    }),


    ...(status && {
      status,
    }),


    ...(search && {

      OR: [

        {
          firstName: {
            contains:
              search,
            mode:
              'insensitive',
          },
        },

        {
          lastName: {
            contains:
              search,
            mode:
              'insensitive',
          },
        },

        {
          fullName: {
            contains:
              search,
            mode:
              'insensitive',
          },
        },

        {
          registryNo: {
            contains:
              search,
          },
        },

        {
          nationalId: {
            contains:
              search,
          },
        },

        {
          position: {
            contains:
              search,
            mode:
              'insensitive',
          },
        },

        {
          corporateEmail: {
            contains:
              search,
            mode:
              'insensitive',
          },
        },

        {
          occupation: {

            name: {
              contains:
                search,
              mode:
                'insensitive',
            },

          },
        },

        {
          occupation: {

            code: {
              contains:
                search,
            },

          },
        },

      ],

    }),

  };


  const take =
    Math.min(
      Math.max(
        Number(pageSize) ||
          20,
        1
      ),
      100
    );


  const currentPage =
    Math.max(
      Number(page) ||
        1,
      1
    );


  const skip =
    (
      currentPage -
      1
    ) * take;


  const [
    items,
    total,
  ] =
    await Promise.all([

      prisma.employee.findMany({

        where,

        include: {

          department:
            true,

          occupation:
            true,

          manager: {

            select: {

              id:
                true,

              firstName:
                true,

              lastName:
                true,

              fullName:
                true,

              registryNo:
                true,

            },

          },

        },

        orderBy: [

          {
            lastName:
              'asc',
          },

          {
            firstName:
              'asc',
          },

          {
            fullName:
              'asc',
          },

        ],

        skip,

        take,

      }),


      prisma.employee.count({
        where,
      }),

    ]);


  res.json({

    success:
      true,

    data:
      items,

    meta: {

      total,

      page:
        currentPage,

      pageSize:
        take,

      pageCount:
        Math.ceil(
          total / take
        ),

    },

  });

}


/* ============================================================
   GET BY ID
============================================================ */

async function getById(
  req,
  res
) {

  await assertEmployeeAccess(
    req,
    req.params.id
  );

  const employee =
    await prisma.employee.findFirst({

      where: {

        id:
          req.params.id,

        companyId:
          req.companyId,

      },

      include: {

        company: {

          select: {

            id:
              true,

            name:
              true,

            companyCode:
              true,

          },

        },


        department:
          true,


        occupation:
          true,


        sgkDocumentType:
          true,


        incentive:
          true,


        terminationReason:
          true,


        bankAccounts: {

          where: {
            isActive:
              true,
          },

          include: {
            bank:
              true,
          },

          orderBy: [

            {
              isPrimary:
                'desc',
            },

            {
              createdAt:
                'asc',
            },

          ],

        },


        educations: {

          orderBy: [

            {
              isContinuing:
                'desc',
            },

            {
              endDate:
                'desc',
            },

            {
              createdAt:
                'desc',
            },

          ],

        },


        familyMembers: {

          orderBy: {
            createdAt:
              'asc',
          },

        },


        emergencyContacts: {

          orderBy: [

            {
              isPrimary:
                'desc',
            },

            {
              createdAt:
                'asc',
            },

          ],

        },


        documents: {

          orderBy: {
            createdAt:
              'desc',
          },

        },


        leaveRequests: {

          orderBy: {
            createdAt:
              'desc',
          },

          take:
            10,

        },


        assets:
          true,


        manager: {

          select: {

            id:
              true,

            registryNo:
              true,

            firstName:
              true,

            lastName:
              true,

            fullName:
              true,

            position:
              true,

          },

        },

      },

    });


  if (!employee) {

    throw new ApiError(
      404,
      'Personel bulunamadi.'
    );

  }


  res.json({

    success:
      true,

    data:
      employee,

  });

}


/* ============================================================
   CREATE
============================================================ */

async function create(
  req,
  res
) {

  const data =
    createEmployeeSchema
      .parse(
        req.body
      );


  /*
   * Is kurallari
   */

  validateBusinessRules(
    data
  );


  /*
   * Master kontrol
   */

  await validateMasterData(
    data,
    req.companyId
  );


  /* ----------------------------------------------------------
     TCKN TEKRAR KONTROL

     Pasif personel dahil.
     Isten ayrilan kisinin sicili korunur.
  ---------------------------------------------------------- */

  const duplicate =
    await prisma
      .employee
      .findFirst({

        where: {

          companyId:
            req.companyId,

          nationalId:
            data.nationalId,

        },

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

      });


  if (duplicate) {

    throw new ApiError(
      409,
      `Bu T.C. kimlik numarasi daha once ${duplicate.registryNo} sicil numarasi ile kaydedilmis.`
    );

  }


  /* ----------------------------------------------------------
     NESTED ALANLARI ANA PERSONELDEN AYIR
  ---------------------------------------------------------- */

  const {

    bankAccounts,

    educations,

    familyMembers,

    emergencyContacts,

    ...employeeData

  } = data;


  const fullName =
    buildFullName(
      employeeData.firstName,
      employeeData.lastName
    );


  /* ----------------------------------------------------------
     TRANSACTION
  ---------------------------------------------------------- */

  const employee =
    await prisma.$transaction(

      async (tx) => {


        /*
         * SICIL
         */

        const registryNo =
          await allocateRegistryNo(
            tx,
            req.companyId
          );


        /*
         * PERSONEL
         */

        return tx.employee.create({

          data: {

            ...employeeData,

            companyId:
              req.companyId,

            registryNo,

            fullName,

            status:
              'PROBATION',


            bankAccounts: {

              create:
                bankAccounts,

            },


            educations: {

              create:
                educations,

            },


            ...(familyMembers &&
              familyMembers.length
              ? {

                  familyMembers: {

                    create:
                      familyMembers,

                  },

                }
              : {}),


            emergencyContacts: {

              create:
                emergencyContacts,

            },

          },


          include: {

            department:
              true,

            occupation:
              true,

            sgkDocumentType:
              true,

            incentive:
              true,


            bankAccounts: {

              include: {
                bank:
                  true,
              },

            },


            educations:
              true,


            familyMembers:
              true,


            emergencyContacts:
              true,


            manager: {

              select: {

                id:
                  true,

                registryNo:
                  true,

                firstName:
                  true,

                lastName:
                  true,

                fullName:
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
        employee,

    });

}


/* ============================================================
   UPDATE
============================================================ */

async function update(
  req,
  res
) {

  /*
   * registryNo schema icinde yok.
   * Bu nedenle sicil request ile degistirilemez.
   */

  const data =
    updateEmployeeSchema
      .parse(
        req.body
      );


  const existing =
    await prisma
      .employee
      .findFirst({

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
      'Personel bulunamadi.'
    );

  }


  /* ----------------------------------------------------------
     KENDI YONETICISI OLAMAZ
  ---------------------------------------------------------- */

  if (
    data.managerId &&
    data.managerId ===
      existing.id
  ) {

    throw new ApiError(
      400,
      'Personel kendi yoneticisi olarak atanamaz.'
    );

  }


  /*
   * Is kurallari
   */

  validateBusinessRules(
    data,
    {
      isUpdate:
        true,

      existing,
    }
  );


  /*
   * Master kontrol
   */

  await validateMasterData(
    data,
    req.companyId
  );


  /* ----------------------------------------------------------
     TCKN DEGISTIYSE
  ---------------------------------------------------------- */

  if (
    data.nationalId &&
    data.nationalId !==
      existing.nationalId
  ) {

    const duplicate =
      await prisma
        .employee
        .findFirst({

          where: {

            companyId:
              req.companyId,

            nationalId:
              data.nationalId,

            NOT: {
              id:
                existing.id,
            },

          },

        });


    if (duplicate) {

      throw new ApiError(
        409,
        'Bu T.C. kimlik numarasi baska bir personelde kayitli.'
      );

    }

  }


  /* ----------------------------------------------------------
     NESTED ALANLAR
  ---------------------------------------------------------- */

  const {

    bankAccounts,

    educations,

    familyMembers,

    emergencyContacts,

    ...employeeData

  } = data;


  /*
   * Ad / Soyad degistiyse fullName
   * otomatik yenilenir.
   */

  const firstName =
    employeeData.firstName ??
    existing.firstName;


  const lastName =
    employeeData.lastName ??
    existing.lastName;


  const fullName =
    buildFullName(
      firstName,
      lastName
    );


  const employee =
    await prisma.$transaction(

      async (tx) => {


        /* ====================================================
           BANKA
        ==================================================== */

        if (
          bankAccounts !==
          undefined
        ) {

          await tx
            .employeeBankAccount
            .deleteMany({

              where: {
                employeeId:
                  existing.id,
              },

            });


          for (
            const account
            of bankAccounts
          ) {

            await tx
              .employeeBankAccount
              .create({

                data: {

                  ...account,

                  employeeId:
                    existing.id,

                },

              });

          }

        }


        /* ====================================================
           EGITIM
        ==================================================== */

        if (
          educations !==
          undefined
        ) {

          await tx
            .employeeEducation
            .deleteMany({

              where: {
                employeeId:
                  existing.id,
              },

            });


          for (
            const education
            of educations
          ) {

            await tx
              .employeeEducation
              .create({

                data: {

                  ...education,

                  employeeId:
                    existing.id,

                },

              });

          }

        }


        /* ====================================================
           AILE
        ==================================================== */

        if (
          familyMembers !==
          undefined
        ) {

          await tx
            .employeeFamilyMember
            .deleteMany({

              where: {
                employeeId:
                  existing.id,
              },

            });


          for (
            const member
            of familyMembers
          ) {

            await tx
              .employeeFamilyMember
              .create({

                data: {

                  ...member,

                  employeeId:
                    existing.id,

                },

              });

          }

        }


        /* ====================================================
           ACIL DURUM
        ==================================================== */

        if (
          emergencyContacts !==
          undefined
        ) {

          await tx
            .employeeEmergencyContact
            .deleteMany({

              where: {
                employeeId:
                  existing.id,
              },

            });


          for (
            const contact
            of emergencyContacts
          ) {

            await tx
              .employeeEmergencyContact
              .create({

                data: {

                  ...contact,

                  employeeId:
                    existing.id,

                },

              });

          }

        }


        /* ====================================================
           ANA PERSONEL
        ==================================================== */

        return tx.employee.update({

          where: {
            id:
              existing.id,
          },

          data: {

            ...employeeData,

            fullName,

          },

          include: {

            department:
              true,

            occupation:
              true,

            sgkDocumentType:
              true,

            incentive:
              true,

            terminationReason:
              true,


            bankAccounts: {

              where: {
                isActive:
                  true,
              },

              include: {
                bank:
                  true,
              },

            },


            educations:
              true,


            familyMembers:
              true,


            emergencyContacts:
              true,


            manager: {

              select: {

                id:
                  true,

                registryNo:
                  true,

                firstName:
                  true,

                lastName:
                  true,

                fullName:
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
      employee,

  });

}


/* ============================================================
   DEACTIVATE / ISTEN CIKIS
============================================================ */

async function deactivate(
  req,
  res
) {

  const data =
    deactivateSchema.parse(
      req.body || {}
    );


  const existing =
    await prisma.employee.findFirst({

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
      'Personel bulunamadi.'
    );

  }


  if (
    existing.status ===
    'TERMINATED'
  ) {

    throw new ApiError(
      400,
      'Personel zaten isten ayrilmis durumda.'
    );

  }


  /* ----------------------------------------------------------
     CIKIS TARIHI ISE GIRISTEN ONCE OLAMAZ
  ---------------------------------------------------------- */

  if (
    new Date(
      data.terminationDate
    ) <
    new Date(
      existing.hireDate
    )
  ) {

    throw new ApiError(
      400,
      'Isten ayrilis tarihi ise giris tarihinden once olamaz.'
    );

  }


  /* ----------------------------------------------------------
     SGK ISTEN CIKIS KODU
  ---------------------------------------------------------- */

  const reason =
    await prisma
      .terminationReason
      .findUnique({

        where: {
          code:
            data
              .terminationReasonCode,
        },

      });


  if (
    !reason ||
    !reason.isActive
  ) {

    throw new ApiError(
      400,
      'Secilen SGK isten cikis kodu bulunamadi veya aktif degil.'
    );

  }


  const employee =
    await prisma
      .employee
      .update({

        where: {
          id:
            existing.id,
        },

        data: {

          /*
           * registryNo YOK.
           * Sicile kesinlikle dokunulmaz.
           */

          status:
            'TERMINATED',

          terminationDate:
            data.terminationDate,

          terminationReasonCode:
            data
              .terminationReasonCode,

          terminationNote:
            data
              .terminationNote,

        },

        include: {

          terminationReason:
            true,

          department:
            true,

          occupation:
            true,

        },

      });


  res.json({

    success:
      true,

    data:
      employee,

  });

}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {

  list,

  getById,

  create,

  previewImport,

  confirmImport,

  update,

  deactivate,

};
