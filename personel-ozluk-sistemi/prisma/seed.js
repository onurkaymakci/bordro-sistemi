const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();


/* ============================================================
   HR PLANET GLOBAL MASTER DATA

   GLOBAL:
   - Bankalar
   - Meslek Kodları
   - SGK Belge Türleri
   - Teşvik / Kanun Kodları
   - SGK İşten Çıkış Kodları

   ŞİRKETE ÖZEL:
   - Personeller
   - Kullanıcılar
   - Departmanlar
   - Organizasyon
   - Zorunlu evrak ayarları
============================================================ */


/* ============================================================
   BANK MASTER
============================================================ */

const bankRows = [
  ['B001','1','T.C. ZİRAAT BANKASI A.Ş.','Mevduat Bankası',true],
  ['B002','4','TÜRKİYE İŞ BANKASI A.Ş.','Mevduat Bankası',true],
  ['B003','6','TÜRKİYE VAKIFLAR BANKASI T.A.O.','Mevduat Bankası',true],
  ['B004','10','TÜRKİYE CUMHURİYETİ ZİRAAT BANKASI A.Ş.','Mevduat Bankası',true],
  ['B005','12','TÜRKİYE HALK BANKASI A.Ş.','Mevduat Bankası',true],
  ['B006','13','DENİZBANK A.Ş.','Mevduat Bankası',true],
  ['B007','14','TÜRK EKONOMİ BANKASI A.Ş.','Mevduat Bankası',true],
  ['B008','15','TÜRKİYE VAKIFLAR BANKASI T.A.O.','Mevduat Bankası',true],
  ['B009','16','TÜRKİYE GARANTİ BANKASI A.Ş.','Mevduat Bankası',true],
  ['B010','17','TÜRKİYE İŞ BANKASI A.Ş.','Mevduat Bankası',true],

  ['B011','20','TÜRKİYE SINAİ KALKINMA BANKASI A.Ş.','Kalkınma/Yatırım Bankası',false],
  ['B012','21','TÜRKİYE İŞ BANKASI A.Ş.','Mevduat Bankası',true],
  ['B013','29','BİRLİKTE GEÇERLİ DEĞİL - ESKİ KOD','Tarihçe',false],
  ['B014','32','TÜRK EKONOMİ BANKASI A.Ş.','Mevduat Bankası',true],
  ['B015','34','DENİZBANK A.Ş.','Mevduat Bankası',true],
  ['B016','46','AKBANK T.A.Ş.','Mevduat Bankası',true],
  ['B017','48','HSBC BANK A.Ş.','Mevduat Bankası',true],
  ['B018','49','ALTERNATİFBANK A.Ş.','Mevduat Bankası',true],
  ['B019','51','TÜRKİYE VAKIFLAR BANKASI T.A.O.','Mevduat Bankası',true],
  ['B020','52','ŞEKERBANK T.A.Ş.','Mevduat Bankası',true],

  ['B021','53','TÜRKİYE HALK BANKASI A.Ş.','Mevduat Bankası',true],
  ['B022','54','TÜRKİYE SINAİ KALKINMA BANKASI A.Ş.','Kalkınma/Yatırım Bankası',false],
  ['B023','56','TÜRKİYE FİNANS KATILIM BANKASI A.Ş.','Katılım Bankası',true],
  ['B024','58','VAKIF KATILIM BANKASI A.Ş.','Katılım Bankası',true],
  ['B025','59','ŞEKERBANK T.A.Ş.','Mevduat Bankası',true],
  ['B026','62','GARANTİ BBVA / TÜRKİYE GARANTİ BANKASI A.Ş.','Mevduat Bankası',true],
  ['B027','64','T.C. ZİRAAT BANKASI A.Ş.','Mevduat Bankası',true],
  ['B028','67','YAPI VE KREDİ BANKASI A.Ş.','Mevduat Bankası',true],
  ['B029','71','TÜRKİYE EMLAK KATILIM BANKASI A.Ş.','Katılım Bankası',true],
  ['B030','87','MİSYON YATIRIM BANKASI A.Ş.','Kalkınma/Yatırım Bankası',false],

  ['B031','92','CITIBANK A.Ş.','Mevduat Bankası',true],
  ['B032','96','TURKLAND BANK A.Ş.','Mevduat Bankası',true],
  ['B033','98','J.P. MORGAN CHASE BANK N.A.','Mevduat Bankası',true],
  ['B034','99','ING BANK A.Ş.','Mevduat Bankası',true],
  ['B035','100','ADİL KATILIM BANKASI A.Ş.','Katılım Bankası',true],
  ['B036','102','KUVEYT TÜRK KATILIM BANKASI A.Ş.','Katılım Bankası',true],
  ['B037','103','ALBARAKA TÜRK KATILIM BANKASI A.Ş.','Katılım Bankası',true],
  ['B038','109','BANK OF CHINA TURKEY A.Ş.','Mevduat Bankası',true],
  ['B039','111','QNB BANK A.Ş.','Mevduat Bankası',true],
  ['B040','113','FİBABANKA A.Ş.','Mevduat Bankası',true],

  ['B041','114','TURKISH BANK A.Ş.','Mevduat Bankası',true],
  ['B042','115','BURGAN BANK A.Ş.','Mevduat Bankası',true],
  ['B043','116','PASHA YATIRIM BANKASI A.Ş.','Kalkınma/Yatırım Bankası',false],
  ['B044','117','ODEA BANK A.Ş.','Mevduat Bankası',true],
  ['B045','118','T.O.M. KATILIM BANKASI A.Ş.','Katılım Bankası',true],
  ['B046','119','HAYAT FİNANS KATILIM BANKASI A.Ş.','Katılım Bankası',true],
  ['B047','120','ENPARA BANK A.Ş.','Mevduat Bankası',true],
  ['B048','121','COLENDİ BANK A.Ş.','Mevduat Bankası',true],
  ['B049','122','FUPS BANK A.Ş.','Mevduat Bankası',true],
  ['B050','123','ZİRAAT DİNAMİK BANKA A.Ş.','Mevduat Bankası',true],

  ['B051','124','DÜNYA KATILIM BANKASI A.Ş.','Katılım Bankası',true],
  ['B052','125','TÜRK TİCARET BANKASI A.Ş.','Mevduat Bankası',true],
  ['B053','126','ICBC TURKEY BANK A.Ş.','Mevduat Bankası',true],
  ['B054','127','MUFG BANK TURKEY A.Ş.','Mevduat Bankası',true],
  ['B055','128','RABOBANK A.Ş.','Mevduat Bankası',true],
  ['B056','129','DEUTSCHE BANK A.Ş.','Mevduat Bankası',true],
  ['B057','130','INTESA SANPAOLO S.P.A. İTALYA İSTANBUL MERKEZ ŞUBESİ','Mevduat Bankası',true],
  ['B058','131','SOCIETE GENERALE (S.A.) PARİS MERKEZİ FRANSA İSTANBUL TÜRKİYE ŞUBESİ','Mevduat Bankası',true],
  ['B059','132','BANK MELLAT MERKEZİ TAHRAN İSTANBUL TÜRKİYE MERKEZ ŞUBESİ','Mevduat Bankası',true],
];


const banks = bankRows.map(
  ([bankCode, eftCode, name, bankType, payrollEligible]) => ({
    bankCode,
    eftCode,
    name,
    bankType,
    payrollEligible,
  })
);


/* ============================================================
   GLOBAL BANK MASTER
============================================================ */

async function seedBanks() {

  console.log('');
  console.log('Global banka master yukleniyor...');

  for (const bank of banks) {

    await prisma.bank.upsert({

      where: {
        bankCode: bank.bankCode,
      },

      update: {
        name: bank.name,
        shortName: bank.name,
        eftCode: bank.eftCode,
        bankType: bank.bankType,
        payrollEligible: bank.payrollEligible,
        isActive: true,
        source: 'Turkiye_Banka_Master_Tablosu_2026.xlsx',
      },

      create: {
        bankCode: bank.bankCode,
        name: bank.name,
        shortName: bank.name,
        eftCode: bank.eftCode,
        bankType: bank.bankType,
        payrollEligible: bank.payrollEligible,
        isActive: true,
        source: 'Turkiye_Banka_Master_Tablosu_2026.xlsx',
      },

    });

  }

  console.log(
    `Global banka master tamamlandi: ${banks.length} kayit`
  );
}


/* ============================================================
   MESLEK KODU EXCEL YARDIMCILARI
============================================================ */

function normalizeHeader(value) {

  return String(value || '')
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replaceAll('İ', 'I')
    .replaceAll('Ş', 'S')
    .replaceAll('Ğ', 'G')
    .replaceAll('Ü', 'U')
    .replaceAll('Ö', 'O')
    .replaceAll('Ç', 'C')
    .replace(/[^A-Z0-9]/g, '');

}


function cleanCell(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value).trim();
}


function findColumnName(row, alternatives) {

  const rowKeys =
    Object.keys(row);

  const normalizedAlternatives =
    alternatives.map(
      normalizeHeader
    );

  return rowKeys.find((key) =>
    normalizedAlternatives.includes(
      normalizeHeader(key)
    )
  );

}


/* ============================================================
   GLOBAL MESLEK KODU MASTER

   Dosya:
   prisma/data/meslek_kodlari.xlsx

   Beklenen kolonlar:
   ISCO-08 KODU
   MESLEK ADI
============================================================ */

async function seedOccupations() {

  console.log('');
  console.log('Global meslek kodu master yukleniyor...');

  const filePath =
    path.resolve(
      __dirname,
      'data',
      'meslek_kodlari.xlsx'
    );


  if (!fs.existsSync(filePath)) {

    throw new Error(
      `Meslek kodu Excel dosyasi bulunamadi: ${filePath}`
    );

  }


  const workbook =
    XLSX.readFile(
      filePath,
      {
        cellDates: false,
      }
    );


  if (
    !workbook.SheetNames ||
    workbook.SheetNames.length === 0
  ) {

    throw new Error(
      'Meslek kodu Excel dosyasinda sayfa bulunamadi.'
    );

  }


  /*
   * İlk dolu sayfayı buluyoruz.
   */

  let selectedSheetName = null;
  let rows = [];


  for (
    const sheetName
    of workbook.SheetNames
  ) {

    const sheet =
      workbook.Sheets[sheetName];

    const tempRows =
      XLSX.utils.sheet_to_json(
        sheet,
        {
          defval: '',
          raw: false,
        }
      );


    if (tempRows.length > 0) {

      selectedSheetName =
        sheetName;

      rows =
        tempRows;

      break;

    }

  }


  if (!rows.length) {

    throw new Error(
      'Meslek kodu Excel dosyasinda veri bulunamadi.'
    );

  }


  console.log(
    `Excel sayfasi: ${selectedSheetName}`
  );


  /*
   * Kolon isimlerini tespit ediyoruz.
   */

  const sampleRow =
    rows[0];


  const codeColumn =
    findColumnName(
      sampleRow,
      [
        'ISCO-08 KODU',
        'ISCO 08 KODU',
        'ISCO08 KODU',
        'ISCO KODU',
        'MESLEK KODU',
        'KOD',
      ]
    );


  const nameColumn =
    findColumnName(
      sampleRow,
      [
        'MESLEK ADI',
        'MESLEK',
        'MESLEK ISMI',
        'MESLEK İSMİ',
        'MESLEK TANIMI',
      ]
    );


  if (
    !codeColumn ||
    !nameColumn
  ) {

    console.error(
      'Excel kolonlari:',
      Object.keys(sampleRow)
    );

    throw new Error(
      'ISCO-08 KODU veya MESLEK ADI kolonu bulunamadi.'
    );

  }


  console.log(
    `Kod kolonu : ${codeColumn}`
  );

  console.log(
    `Ad kolonu  : ${nameColumn}`
  );


  /*
   * Aynı meslek kodu Excel'de iki kez varsa
   * tek kayda düşürüyoruz.
   */

  const occupationMap =
    new Map();


  for (const row of rows) {

    let code =
      cleanCell(
        row[codeColumn]
      );

    const name =
      cleanCell(
        row[nameColumn]
      );


    if (
      !code ||
      !name
    ) {
      continue;
    }


    /*
     * Excel bazen kodları sayı olarak algılayabilir.
     * Burada string olarak koruyoruz.
     */

    code =
      code.replace(
        /,/g,
        '.'
      );


    occupationMap.set(
      code,
      {
        code,
        name,
        isActive: true,
      }
    );

  }


  const occupations =
    [...occupationMap.values()];


  if (!occupations.length) {

    throw new Error(
      'Excel dosyasindan gecerli meslek kodu okunamadi.'
    );

  }


  console.log(
    `Excel'den ${occupations.length} benzersiz meslek kodu okundu.`
  );


  /*
   * 7.000+ satırı tek tek sırayla beklemek yerine
   * 200'erli gruplar halinde upsert ediyoruz.
   *
   * Böylece:
   * - ilk çalışmada kayıt oluşturur
   * - ikinci çalışmada çoğaltmaz
   * - meslek adı değişmişse günceller
   */

  const batchSize =
    200;


  let processed =
    0;


  for (
    let i = 0;
    i < occupations.length;
    i += batchSize
  ) {

    const batch =
      occupations.slice(
        i,
        i + batchSize
      );


    await prisma.$transaction(

      batch.map((occupation) =>

        prisma.occupation.upsert({

          where: {
            code:
              occupation.code,
          },

          update: {
            name:
              occupation.name,

            isActive:
              true,
          },

          create: {
            code:
              occupation.code,

            name:
              occupation.name,

            isActive:
              true,
          },

        })

      )

    );


    processed +=
      batch.length;


    console.log(
      `Meslek kodu: ${processed}/${occupations.length}`
    );

  }


  const totalInDatabase =
    await prisma.occupation.count();


  console.log('');
  console.log(
    `Global meslek kodu master tamamlandi.`
  );

  console.log(
    `Bu Excel'den islenen: ${occupations.length}`
  );

  console.log(
    `Veritabanindaki toplam meslek kodu: ${totalInDatabase}`
  );

}


/* ============================================================
   GLOBAL SGK BELGE TURU MASTER
============================================================ */

const sgkDocumentTypes = [

  {
    code: '01',
    name: '01 Nolu Belge',
    description:
      'Hizmet akdi ile tum sigorta kollarina tabi calisanlar (normal sigortalilar ve yabanci uyruklular).',
  },

  {
    code: '02',
    name: '02 Nolu Belge',
    description:
      'Sosyal Guvenlik Destek Primine (SGDP) tabi calisanlar (emekli olup calismaya devam edenler).',
  },

  {
    code: '04',
    name: '04 Nolu Belge',
    description:
      'Yeraltinda surekli calisan maden iscileri.',
  },

  {
    code: '05',
    name: '05 Nolu Belge',
    description:
      'Yeraltinda gruplu (munavebeli) calisan maden iscileri.',
  },

  {
    code: '06',
    name: '06 Nolu Belge',
    description:
      'Yerustu gruplu calisan maden iscileri.',
  },

  {
    code: '07',
    name: '07 Nolu Belge',
    description:
      '3308 sayili Kanun kapsamindaki aday cirak, cirak ve isletmelerde mesleki egitim goren ogrenciler.',
  },

  {
    code: '13',
    name: '13 Nolu Belge',
    description:
      'Tum sigorta kollarina tabi olup issizlik sigortasi primi kesilmeyenler.',
  },

  {
    code: '19',
    name: '19 Nolu Belge',
    description:
      'Yurt disinda calisan Turk iscileri (ozel anlasmali ulkeler vb.).',
  },

  {
    code: '22',
    name: '22 Nolu Belge',
    description:
      "4857 sayili Kanun'un ek 2'nci maddesine gore kismi sureli calisanlar / atipik istihdam.",
  },

  {
    code: '90',
    name: '90 Nolu Belge',
    description:
      'Ev hizmetlerinde 10 gunden fazla calisanlar.',
  },

];


async function seedSgkDocumentTypes() {

  console.log('');
  console.log('Global SGK belge turu master yukleniyor...');


  for (
    const documentType
    of sgkDocumentTypes
  ) {

    await prisma.sgkDocumentType.upsert({

      where: {
        code:
          documentType.code,
      },

      update: {

        name:
          documentType.name,

        description:
          documentType.description,

        isActive:
          true,

      },

      create: {

        code:
          documentType.code,

        name:
          documentType.name,

        description:
          documentType.description,

        isActive:
          true,

      },

    });

  }


  console.log(
    `Global SGK belge turu master tamamlandi: ${sgkDocumentTypes.length} kayit`
  );

}


/* ============================================================
   HR PLANET DEMO
============================================================ */

async function seedDemoCompany() {

  console.log('');
  console.log(
    'HR PLANET DEMO kontrol ediliyor...'
  );


  /* ----------------------------------------------------------
     ŞİRKET
  ---------------------------------------------------------- */

  const company =
    await prisma.company.upsert({

      where: {
        companyCode:
          'HRP001',
      },

      update: {
        name:
          'HR PLANET DEMO',

        isActive:
          true,
      },

      create: {
        name:
          'HR PLANET DEMO',

        companyCode:
          'HRP001',

        isActive:
          true,
      },

    });


  console.log(
    'Sirket hazir:',
    company.companyCode,
    '-',
    company.name
  );


  /* ----------------------------------------------------------
     ADMIN
  ---------------------------------------------------------- */

  const passwordHash =
    await bcrypt.hash(
      '123456',
      10
    );


  const existingAdmin =
    await prisma.user.findUnique({

      where: {
        username:
          'admin',
      },

    });


  let admin;


  if (existingAdmin) {

    admin =
      await prisma.user.update({

        where: {
          id:
            existingAdmin.id,
        },

        data: {
          companyId:
            company.id,

          fullName:
            existingAdmin.fullName ||
            'HR Planet Admin',

          passwordHash,

          isActive:
            true,
        },

      });

  } else {

    admin =
      await prisma.user.create({

        data: {
          companyId:
            company.id,

          fullName:
            'HR Planet Admin',

          username:
            'admin',

          email:
            'admin@hrplanet.demo',

          passwordHash,

          role:
            'KEY_USER',

          isActive:
            true,
        },

      });

  }


  console.log(
    'Admin kullanici hazir:',
    admin.username
  );


  /* ----------------------------------------------------------
     ZORUNLU EVRAKLAR
  ---------------------------------------------------------- */

  const mandatoryDocuments = [

    {
      code:
        'ID_COPY',

      name:
        'Kimlik Fotokopisi',

      validityDays:
        null,
    },

    {
      code:
        'EMPLOYMENT_CONTRACT',

      name:
        'İş Sözleşmesi',

      validityDays:
        null,
    },

    {
      code:
        'DIPLOMA',

      name:
        'Diploma',

      validityDays:
        null,
    },

    {
      code:
        'CRIMINAL_RECORD',

      name:
        'Adli Sicil Kaydı',

      validityDays:
        null,
    },

    {
      code:
        'HEALTH_REPORT',

      name:
        'İşe Giriş Sağlık Raporu',

      validityDays:
        365,
    },

  ];


  for (
    const doc
    of mandatoryDocuments
  ) {

    await prisma.mandatoryDocumentType.upsert({

      where: {

        companyId_code: {

          companyId:
            company.id,

          code:
            doc.code,

        },

      },

      update: {

        name:
          doc.name,

        isRequired:
          true,

        validityDays:
          doc.validityDays,

      },

      create: {

        companyId:
          company.id,

        code:
          doc.code,

        name:
          doc.name,

        isRequired:
          true,

        validityDays:
          doc.validityDays,

      },

    });

  }


  /* ----------------------------------------------------------
     DEMO DEPARTMANLARI
  ---------------------------------------------------------- */

  const departmentNames = [

    'İnsan Kaynakları',

    'Bilgi Teknolojileri',

  ];


  for (
    const name
    of departmentNames
  ) {

    const exists =
      await prisma.department.findFirst({

        where: {
          companyId:
            company.id,

          name,
        },

      });


    if (!exists) {

      await prisma.department.create({

        data: {
          companyId:
            company.id,

          name,
        },

      });

    }

  }


  console.log(
    'HRP001 demo sirket verileri hazir.'
  );


  return company;

}


/* ============================================================
   MAIN
============================================================ */

async function main() {

  console.log('');
  console.log(
    '======================================'
  );

  console.log(
    'HR PLANET SEED BASLIYOR'
  );

  console.log(
    '======================================'
  );


  /* ----------------------------------------------------------
     GLOBAL MASTERLAR
  ---------------------------------------------------------- */

  await seedBanks();

  await seedOccupations();

  await seedSgkDocumentTypes();


  /* ----------------------------------------------------------
     DEMO ŞİRKET
  ---------------------------------------------------------- */

  const company =
    await seedDemoCompany();


  /* ----------------------------------------------------------
     SONUÇ
  ---------------------------------------------------------- */

  const bankCount =
    await prisma.bank.count();

  const occupationCount =
    await prisma.occupation.count();

  const sgkDocumentTypeCount =
    await prisma.sgkDocumentType.count();


  console.log('');
  console.log(
    '======================================'
  );

  console.log(
    'SEED TAMAMLANDI'
  );

  console.log(
    '======================================'
  );

  console.log('');

  console.log(
    'Şirket Adı : HR PLANET DEMO'
  );

  console.log(
    'Şirket Kodu: HRP001'
  );

  console.log(
    'Kullanıcı  : admin'
  );

  console.log(
    'Şifre      : 123456'
  );

  console.log(
    'Şirket ID  :',
    company.id
  );

  console.log('');

  console.log(
    `Global Banka Master       : ${bankCount} kayıt`
  );

  console.log(
    `Global Meslek Kodu Master : ${occupationCount} kayıt`
  );

  console.log(
    `Global SGK Belge Turu     : ${sgkDocumentTypeCount} kayıt`
  );

}


/* ============================================================
   RUN
============================================================ */

main()

  .catch((error) => {

    console.error('');
    console.error(
      'SEED HATASI:'
    );

    console.error(
      error
    );

    process.exit(1);

  })

  .finally(async () => {

    await prisma.$disconnect();

  });