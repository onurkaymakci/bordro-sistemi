const prisma = require('../config/prisma');


// ============================================================
// BANKALAR
// GET /api/master/banks?search=zira
// ============================================================

async function listBanks(req, res) {

  const search = (req.query.search || '').trim();

  const items = await prisma.bank.findMany({

    where: {
      isActive: true,

      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            shortName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            bankCode: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            eftCode: {
              contains: search,
            },
          },
        ],
      }),
    },

    orderBy: {
      name: 'asc',
    },

    take: 50,

  });

  res.json({
    success: true,
    data: items,
  });
}


// ============================================================
// MESLEK KODLARI
// GET /api/master/occupations?search=yazilim
// GET /api/master/occupations?search=2512
// ============================================================

async function listOccupations(req, res) {

  const search = (req.query.search || '').trim();

  const items = await prisma.occupation.findMany({

    where: {
      isActive: true,

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    },

    orderBy: [
      {
        code: 'asc',
      },
    ],

    take: 50,

  });

  res.json({
    success: true,
    data: items,
  });
}


// ============================================================
// SGK BELGE TURLERI
// GET /api/master/sgk-document-types?search=43
// ============================================================

async function listSgkDocumentTypes(req, res) {

  const search = (req.query.search || '').trim();

  const items = await prisma.sgkDocumentType.findMany({

    where: {
      isActive: true,

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    },

    orderBy: {
      code: 'asc',
    },

    take: 50,

  });

  res.json({
    success: true,
    data: items,
  });
}


// ============================================================
// TESVIK / KANUN NUMARALARI
// GET /api/master/incentives?search=05510
// ============================================================

async function listIncentives(req, res) {

  const search = (req.query.search || '').trim();

  const items = await prisma.incentiveLaw.findMany({

    where: {
      isActive: true,

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            legalBasis: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    },

    orderBy: {
      code: 'asc',
    },

    take: 50,

  });

  res.json({
    success: true,
    data: items,
  });
}


// ============================================================
// ISTEN CIKIS KODLARI
// GET /api/master/termination-reasons?search=istifa
// GET /api/master/termination-reasons?search=3
// ============================================================

async function listTerminationReasons(req, res) {

  const search = (req.query.search || '').trim();

  const items = await prisma.terminationReason.findMany({

    where: {
      isActive: true,

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    },

    orderBy: {
      code: 'asc',
    },

    take: 50,

  });

  res.json({
    success: true,
    data: items,
  });
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  listBanks,
  listOccupations,
  listSgkDocumentTypes,
  listIncentives,
  listTerminationReasons,
};