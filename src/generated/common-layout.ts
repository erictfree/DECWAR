// Generated from HISEG/LOWSEG, checked against WARMAC and DECWAR.MAP.
export const commonLayout = {
  "hiseg": {
    "file": "HISEG.FOR",
    "address": 131080,
    "words": 2922,
    "mapLine": 31,
    "fields": {
      "hfz": {
        "type": "integer",
        "dimensions": [],
        "line": 36,
        "offset": 0,
        "words": 1,
        "assembly": {
          "name": "hfz",
          "line": 396,
          "type": "integer"
        }
      },
      "shpcon": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          },
          {
            "lower": 1,
            "length": 10
          }
        ],
        "line": 37,
        "offset": 1,
        "words": 100,
        "assembly": {
          "name": "shpcon",
          "line": 398,
          "type": "integer"
        }
      },
      "shpdam": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          },
          {
            "lower": 1,
            "length": 9
          }
        ],
        "line": 38,
        "offset": 101,
        "words": 90,
        "assembly": {
          "name": "shpdam",
          "line": 399,
          "type": "integer"
        }
      },
      "base": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          },
          {
            "lower": 1,
            "length": 4
          },
          {
            "lower": 1,
            "length": 2
          }
        ],
        "line": 39,
        "offset": 191,
        "words": 80,
        "assembly": {
          "name": "base",
          "line": 400,
          "type": "integer"
        }
      },
      "nbase": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          }
        ],
        "line": 40,
        "offset": 271,
        "words": 2,
        "assembly": {
          "name": "nbase",
          "line": 401,
          "type": "integer"
        }
      },
      "board": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 1875
          }
        ],
        "line": 41,
        "offset": 273,
        "words": 1875,
        "assembly": {
          "name": "board",
          "line": 402,
          "type": "integer"
        }
      },
      "locpln": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 60
          },
          {
            "lower": 1,
            "length": 4
          }
        ],
        "line": 42,
        "offset": 2148,
        "words": 240,
        "assembly": {
          "name": "locpln",
          "line": 403,
          "type": "integer"
        }
      },
      "locr": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          }
        ],
        "line": 43,
        "offset": 2388,
        "words": 2,
        "assembly": {
          "name": "locr",
          "line": 404,
          "type": "integer"
        }
      },
      "erom": {
        "type": "integer",
        "dimensions": [],
        "line": 44,
        "offset": 2390,
        "words": 1,
        "assembly": {
          "name": "erom",
          "line": 405,
          "type": "integer"
        }
      },
      "eromo": {
        "type": "integer",
        "dimensions": [],
        "line": 45,
        "offset": 2391,
        "words": 1,
        "assembly": {
          "name": "eromo",
          "line": 406,
          "type": "integer"
        }
      },
      "rsr": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 8
          }
        ],
        "line": 46,
        "offset": 2392,
        "words": 8,
        "assembly": {
          "name": "rsr",
          "line": 407,
          "type": "integer"
        }
      },
      "nplnet": {
        "type": "integer",
        "dimensions": [],
        "line": 47,
        "offset": 2400,
        "words": 1,
        "assembly": {
          "name": "nplnet",
          "line": 408,
          "type": "integer"
        }
      },
      "rom": {
        "type": "logical",
        "dimensions": [],
        "line": 48,
        "offset": 2401,
        "words": 1,
        "assembly": {
          "name": "rom",
          "line": 409,
          "type": "logical"
        }
      },
      "romcnt": {
        "type": "integer",
        "dimensions": [],
        "line": 49,
        "offset": 2402,
        "words": 1,
        "assembly": {
          "name": "romcnt",
          "line": 410,
          "type": "integer"
        }
      },
      "rtpaus": {
        "type": "integer",
        "dimensions": [],
        "line": 50,
        "offset": 2403,
        "words": 1,
        "assembly": {
          "name": "rtpaus",
          "line": 411,
          "type": "integer"
        }
      },
      "rppaus": {
        "type": "integer",
        "dimensions": [],
        "line": 51,
        "offset": 2404,
        "words": 1,
        "assembly": {
          "name": "rppaus",
          "line": 412,
          "type": "integer"
        }
      },
      "job": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          },
          {
            "lower": 1,
            "length": 9
          }
        ],
        "line": 52,
        "offset": 2405,
        "words": 90,
        "assembly": {
          "name": "job",
          "line": 413,
          "type": "integer"
        }
      },
      "msgflg": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          }
        ],
        "line": 53,
        "offset": 2495,
        "words": 10,
        "assembly": {
          "name": "msgflg",
          "line": 414,
          "type": "integer"
        }
      },
      "hitflg": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          }
        ],
        "line": 54,
        "offset": 2505,
        "words": 10,
        "assembly": {
          "name": "hitflg",
          "line": 415,
          "type": "integer"
        }
      },
      "numcap": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          }
        ],
        "line": 55,
        "offset": 2515,
        "words": 2,
        "assembly": {
          "name": "numcap",
          "line": 416,
          "type": "integer"
        }
      },
      "romopt": {
        "type": "integer",
        "dimensions": [],
        "line": 56,
        "offset": 2517,
        "words": 1,
        "assembly": {
          "name": "romopt",
          "line": 417,
          "type": "integer"
        }
      },
      "blhopt": {
        "type": "integer",
        "dimensions": [],
        "line": 57,
        "offset": 2518,
        "words": 1,
        "assembly": {
          "name": "blhopt",
          "line": 418,
          "type": "integer"
        }
      },
      "endflg": {
        "type": "integer",
        "dimensions": [],
        "line": 58,
        "offset": 2519,
        "words": 1,
        "assembly": {
          "name": "endflg",
          "line": 419,
          "type": "integer"
        }
      },
      "nomsg": {
        "type": "integer",
        "dimensions": [],
        "line": 59,
        "offset": 2520,
        "words": 1,
        "assembly": {
          "name": "nomsg",
          "line": 420,
          "type": "integer"
        }
      },
      "tmscor": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          },
          {
            "lower": 1,
            "length": 8
          }
        ],
        "line": 60,
        "offset": 2521,
        "words": 16,
        "assembly": {
          "name": "tmscor",
          "line": 421,
          "type": "integer"
        }
      },
      "tim0": {
        "type": "integer",
        "dimensions": [],
        "line": 61,
        "offset": 2537,
        "words": 1,
        "assembly": {
          "name": "tim0",
          "line": 422,
          "type": "integer"
        }
      },
      "slwest": {
        "type": "integer",
        "dimensions": [],
        "line": 62,
        "offset": 2538,
        "words": 1,
        "assembly": {
          "name": "slwest",
          "line": 423,
          "type": "integer"
        }
      },
      "kilque": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          },
          {
            "lower": 1,
            "length": 5
          }
        ],
        "line": 63,
        "offset": 2539,
        "words": 50,
        "assembly": {
          "name": "kilque",
          "line": 424,
          "type": "integer"
        }
      },
      "nkill": {
        "type": "integer",
        "dimensions": [],
        "line": 64,
        "offset": 2589,
        "words": 1,
        "assembly": {
          "name": "nkill",
          "line": 425,
          "type": "integer"
        }
      },
      "kilndx": {
        "type": "integer",
        "dimensions": [],
        "line": 65,
        "offset": 2590,
        "words": 1,
        "assembly": {
          "name": "kilndx",
          "line": 426,
          "type": "integer"
        }
      },
      "tmturn": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 3
          }
        ],
        "line": 66,
        "offset": 2591,
        "words": 3,
        "assembly": {
          "name": "tmturn",
          "line": 427,
          "type": "integer"
        }
      },
      "numshp": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          }
        ],
        "line": 67,
        "offset": 2594,
        "words": 2,
        "assembly": {
          "name": "numshp",
          "line": 428,
          "type": "integer"
        }
      },
      "numrom": {
        "type": "integer",
        "dimensions": [],
        "line": 68,
        "offset": 2596,
        "words": 1,
        "assembly": {
          "name": "numrom",
          "line": 429,
          "type": "integer"
        }
      },
      "trstat": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          }
        ],
        "line": 69,
        "offset": 2597,
        "words": 10,
        "assembly": {
          "name": "trstat",
          "line": 430,
          "type": "integer"
        }
      },
      "active": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          }
        ],
        "line": 70,
        "offset": 2607,
        "words": 10,
        "assembly": {
          "name": "active",
          "line": 431,
          "type": "integer"
        }
      },
      "alive": {
        "type": "logical",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          }
        ],
        "line": 71,
        "offset": 2617,
        "words": 10,
        "assembly": {
          "name": "alive",
          "line": 432,
          "type": "logical"
        }
      },
      "comknt": {
        "type": "integer",
        "dimensions": [],
        "line": 72,
        "offset": 2627,
        "words": 1,
        "assembly": {
          "name": "comknt",
          "line": 433,
          "type": "integer"
        }
      },
      "hitime": {
        "type": "integer",
        "dimensions": [],
        "line": 73,
        "offset": 2628,
        "words": 1,
        "assembly": {
          "name": "hitime",
          "line": 434,
          "type": "integer"
        }
      },
      "dead": {
        "type": "logical",
        "dimensions": [],
        "line": 74,
        "offset": 2629,
        "words": 1,
        "assembly": {
          "name": "dead",
          "line": 435,
          "type": "logical"
        }
      },
      "docked": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          }
        ],
        "line": 75,
        "offset": 2630,
        "words": 10,
        "assembly": {
          "name": "docked",
          "line": 436,
          "type": "integer"
        }
      },
      "hlz": {
        "type": "integer",
        "dimensions": [],
        "line": 76,
        "offset": 2640,
        "words": 1,
        "assembly": {
          "name": "hlz",
          "line": 437,
          "type": "integer"
        }
      },
      "plnlok": {
        "type": "integer",
        "dimensions": [],
        "line": 80,
        "offset": 2641,
        "words": 1,
        "assembly": {
          "name": "plnlok",
          "line": 441,
          "type": "integer"
        }
      },
      "frelok": {
        "type": "integer",
        "dimensions": [],
        "line": 81,
        "offset": 2642,
        "words": 1,
        "assembly": {
          "name": "frelok",
          "line": 442,
          "type": "integer"
        }
      },
      "quelok": {
        "type": "integer",
        "dimensions": [],
        "line": 82,
        "offset": 2643,
        "words": 1,
        "assembly": {
          "name": "quelok",
          "line": 443,
          "type": "integer"
        }
      },
      "device": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 9
          }
        ],
        "line": 84,
        "offset": 2644,
        "words": 9,
        "assembly": {
          "name": "device",
          "line": 445,
          "type": "integer"
        }
      },
      "isaydo": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          },
          {
            "lower": 1,
            "length": 33
          }
        ],
        "line": 85,
        "offset": 2653,
        "words": 66,
        "assembly": {
          "name": "isaydo",
          "line": 446,
          "type": "integer"
        }
      },
      "xhelp": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          },
          {
            "lower": 1,
            "length": 8
          }
        ],
        "line": 86,
        "offset": 2719,
        "words": 16,
        "assembly": {
          "name": "xhelp",
          "line": 447,
          "type": "integer"
        }
      },
      "ttydat": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          },
          {
            "lower": 1,
            "length": 8
          }
        ],
        "line": 87,
        "offset": 2735,
        "words": 16,
        "assembly": {
          "name": "ttydat",
          "line": 448,
          "type": "integer"
        }
      },
      "names": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 10
          },
          {
            "lower": 1,
            "length": 3
          }
        ],
        "line": 88,
        "offset": 2751,
        "words": 30,
        "assembly": {
          "name": "names",
          "line": 449,
          "type": "integer"
        }
      },
      "bits": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 18
          }
        ],
        "line": 89,
        "offset": 2781,
        "words": 18,
        "assembly": {
          "name": "bits",
          "line": 450,
          "type": "integer"
        }
      },
      "sbits": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 0,
            "length": 3
          }
        ],
        "line": 91,
        "offset": 2799,
        "words": 3,
        "assembly": {
          "name": "sbits",
          "line": 452,
          "type": "integer"
        }
      },
      "cmdbts": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 33
          }
        ],
        "line": 92,
        "offset": 2802,
        "words": 33,
        "assembly": {
          "name": "cmdbts",
          "line": 453,
          "type": "integer"
        }
      },
      "numply": {
        "type": "integer",
        "dimensions": [],
        "line": 93,
        "offset": 2835,
        "words": 1,
        "assembly": {
          "name": "numply",
          "line": 454,
          "type": "integer"
        }
      },
      "numsid": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          }
        ],
        "line": 94,
        "offset": 2836,
        "words": 2,
        "assembly": {
          "name": "numsid",
          "line": 455,
          "type": "integer"
        }
      },
      "versio": {
        "type": "integer",
        "dimensions": [],
        "line": 95,
        "offset": 2838,
        "words": 1,
        "assembly": {
          "name": "versio",
          "line": 456,
          "type": "integer"
        }
      },
      "gameno": {
        "type": "integer",
        "dimensions": [],
        "line": 96,
        "offset": 2839,
        "words": 1,
        "assembly": {
          "name": "gameno",
          "line": 457,
          "type": "integer"
        }
      },
      "dotime": {
        "type": "integer",
        "dimensions": [],
        "line": 97,
        "offset": 2840,
        "words": 1,
        "assembly": {
          "name": "dotime",
          "line": 458,
          "type": "integer"
        }
      },
      "score": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 8
          },
          {
            "lower": 1,
            "length": 10
          }
        ],
        "line": 98,
        "offset": 2841,
        "words": 80,
        "assembly": {
          "name": "score",
          "line": 459,
          "type": "integer"
        }
      },
      "hilst": {
        "type": "implicit-integer",
        "dimensions": [],
        "line": 32,
        "offset": 2921,
        "words": 1,
        "assembly": {
          "name": "hi.lst",
          "line": 460,
          "type": "integer"
        }
      }
    }
  },
  "lowseg": {
    "file": "LOWSEG.FOR",
    "address": 96,
    "words": 128,
    "mapLine": 22,
    "fields": {
      "lfz": {
        "type": "integer",
        "dimensions": [],
        "line": 30,
        "offset": 0,
        "words": 1,
        "assembly": {
          "name": "lfz",
          "line": 471,
          "type": "integer"
        }
      },
      "ntok": {
        "type": "integer",
        "dimensions": [],
        "line": 31,
        "offset": 1,
        "words": 1,
        "assembly": {
          "name": "ntok",
          "line": 472,
          "type": "integer"
        }
      },
      "tknlst": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 15
          }
        ],
        "line": 32,
        "offset": 2,
        "words": 15,
        "assembly": {
          "name": "tknlst",
          "line": 473,
          "type": "integer"
        }
      },
      "vallst": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 15
          }
        ],
        "line": 33,
        "offset": 17,
        "words": 15,
        "assembly": {
          "name": "vallst",
          "line": 474,
          "type": "integer"
        }
      },
      "typlst": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 15
          }
        ],
        "line": 34,
        "offset": 32,
        "words": 15,
        "assembly": {
          "name": "typlst",
          "line": 475,
          "type": "integer"
        }
      },
      "ptrlst": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 15
          }
        ],
        "line": 35,
        "offset": 47,
        "words": 15,
        "assembly": {
          "name": "ptrlst",
          "line": 476,
          "type": "integer"
        }
      },
      "who": {
        "type": "integer",
        "dimensions": [],
        "line": 36,
        "offset": 62,
        "words": 1,
        "assembly": {
          "name": "who",
          "line": 477,
          "type": "integer"
        }
      },
      "iwhat": {
        "type": "integer",
        "dimensions": [],
        "line": 37,
        "offset": 63,
        "words": 1,
        "assembly": {
          "name": "iwhat",
          "line": 478,
          "type": "integer"
        }
      },
      "ihita": {
        "type": "integer",
        "dimensions": [],
        "line": 38,
        "offset": 64,
        "words": 1,
        "assembly": {
          "name": "ihita",
          "line": 479,
          "type": "integer"
        }
      },
      "vto": {
        "type": "integer",
        "dimensions": [],
        "line": 39,
        "offset": 65,
        "words": 1,
        "assembly": {
          "name": "vto",
          "line": 480,
          "type": "integer"
        }
      },
      "hto": {
        "type": "integer",
        "dimensions": [],
        "line": 40,
        "offset": 66,
        "words": 1,
        "assembly": {
          "name": "hto",
          "line": 481,
          "type": "integer"
        }
      },
      "vfrom": {
        "type": "integer",
        "dimensions": [],
        "line": 41,
        "offset": 67,
        "words": 1,
        "assembly": {
          "name": "vfrom",
          "line": 482,
          "type": "integer"
        }
      },
      "hfrom": {
        "type": "integer",
        "dimensions": [],
        "line": 42,
        "offset": 68,
        "words": 1,
        "assembly": {
          "name": "hfrom",
          "line": 483,
          "type": "integer"
        }
      },
      "critdv": {
        "type": "integer",
        "dimensions": [],
        "line": 43,
        "offset": 69,
        "words": 1,
        "assembly": {
          "name": "critdv",
          "line": 484,
          "type": "integer"
        }
      },
      "critdm": {
        "type": "integer",
        "dimensions": [],
        "line": 44,
        "offset": 70,
        "words": 1,
        "assembly": {
          "name": "critdm",
          "line": 485,
          "type": "integer"
        }
      },
      "klflg": {
        "type": "integer",
        "dimensions": [],
        "line": 45,
        "offset": 71,
        "words": 1,
        "assembly": {
          "name": "klflg",
          "line": 486,
          "type": "integer"
        }
      },
      "dispfr": {
        "type": "integer",
        "dimensions": [],
        "line": 46,
        "offset": 72,
        "words": 1,
        "assembly": {
          "name": "dispfr",
          "line": 487,
          "type": "integer"
        }
      },
      "dispto": {
        "type": "integer",
        "dimensions": [],
        "line": 47,
        "offset": 73,
        "words": 1,
        "assembly": {
          "name": "dispto",
          "line": 488,
          "type": "integer"
        }
      },
      "dbits": {
        "type": "integer",
        "dimensions": [],
        "line": 48,
        "offset": 74,
        "words": 1,
        "assembly": {
          "name": "dbits",
          "line": 489,
          "type": "integer"
        }
      },
      "shcnto": {
        "type": "integer",
        "dimensions": [],
        "line": 49,
        "offset": 75,
        "words": 1,
        "assembly": {
          "name": "shcnto",
          "line": 490,
          "type": "integer"
        }
      },
      "shstto": {
        "type": "integer",
        "dimensions": [],
        "line": 50,
        "offset": 76,
        "words": 1,
        "assembly": {
          "name": "shstto",
          "line": 491,
          "type": "integer"
        }
      },
      "shcnfr": {
        "type": "integer",
        "dimensions": [],
        "line": 51,
        "offset": 77,
        "words": 1,
        "assembly": {
          "name": "shcnfr",
          "line": 492,
          "type": "integer"
        }
      },
      "shstfr": {
        "type": "integer",
        "dimensions": [],
        "line": 52,
        "offset": 78,
        "words": 1,
        "assembly": {
          "name": "shstfr",
          "line": 493,
          "type": "integer"
        }
      },
      "shjump": {
        "type": "integer",
        "dimensions": [],
        "line": 53,
        "offset": 79,
        "words": 1,
        "assembly": {
          "name": "shjump",
          "line": 494,
          "type": "integer"
        }
      },
      "group": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 7
          },
          {
            "lower": 1,
            "length": 2
          }
        ],
        "line": 54,
        "offset": 80,
        "words": 14,
        "assembly": {
          "name": "group",
          "line": 495,
          "type": "integer"
        }
      },
      "ngroup": {
        "type": "integer",
        "dimensions": [],
        "line": 55,
        "offset": 94,
        "words": 1,
        "assembly": {
          "name": "ngroup",
          "line": 496,
          "type": "integer"
        }
      },
      "pasflg": {
        "type": "integer",
        "dimensions": [],
        "line": 56,
        "offset": 95,
        "words": 1,
        "assembly": {
          "name": "pasflg",
          "line": 497,
          "type": "integer"
        }
      },
      "shtype": {
        "type": "integer",
        "dimensions": [],
        "line": 57,
        "offset": 96,
        "words": 1,
        "assembly": {
          "name": "shtype",
          "line": 498,
          "type": "integer"
        }
      },
      "team": {
        "type": "integer",
        "dimensions": [],
        "line": 58,
        "offset": 97,
        "words": 1,
        "assembly": {
          "name": "team",
          "line": 499,
          "type": "integer"
        }
      },
      "ccflg": {
        "type": "logical",
        "dimensions": [],
        "line": 59,
        "offset": 98,
        "words": 1,
        "assembly": {
          "name": "ccflg",
          "line": 500,
          "type": "logical"
        }
      },
      "player": {
        "type": "logical",
        "dimensions": [],
        "line": 60,
        "offset": 99,
        "words": 1,
        "assembly": {
          "name": "player",
          "line": 502,
          "type": "logical"
        }
      },
      "tpoint": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 8
          }
        ],
        "line": 61,
        "offset": 100,
        "words": 8,
        "assembly": {
          "name": "tpoint",
          "line": 503,
          "type": "integer"
        }
      },
      "phbank": {
        "type": "integer",
        "dimensions": [
          {
            "lower": 1,
            "length": 2
          }
        ],
        "line": 62,
        "offset": 108,
        "words": 2,
        "assembly": {
          "name": "phbank",
          "line": 504,
          "type": "integer"
        }
      },
      "tobank": {
        "type": "integer",
        "dimensions": [],
        "line": 63,
        "offset": 110,
        "words": 1,
        "assembly": {
          "name": "tobank",
          "line": 505,
          "type": "integer"
        }
      },
      "ptime": {
        "type": "integer",
        "dimensions": [],
        "line": 64,
        "offset": 111,
        "words": 1,
        "assembly": {
          "name": "ptime",
          "line": 506,
          "type": "integer"
        }
      },
      "prtype": {
        "type": "integer",
        "dimensions": [],
        "line": 65,
        "offset": 112,
        "words": 1,
        "assembly": {
          "name": "prtype",
          "line": 507,
          "type": "integer"
        }
      },
      "rptflg": {
        "type": "logical",
        "dimensions": [],
        "line": 66,
        "offset": 113,
        "words": 1,
        "assembly": {
          "name": "rptflg",
          "line": 508,
          "type": "logical"
        }
      },
      "gagmsg": {
        "type": "integer",
        "dimensions": [],
        "line": 67,
        "offset": 114,
        "words": 1,
        "assembly": {
          "name": "gagmsg",
          "line": 509,
          "type": "integer"
        }
      },
      "oflg": {
        "type": "integer",
        "dimensions": [],
        "line": 68,
        "offset": 115,
        "words": 1,
        "assembly": {
          "name": "oflg",
          "line": 510,
          "type": "integer"
        }
      },
      "scnflg": {
        "type": "integer",
        "dimensions": [],
        "line": 69,
        "offset": 116,
        "words": 1,
        "assembly": {
          "name": "scnflg",
          "line": 511,
          "type": "integer"
        }
      },
      "ttytyp": {
        "type": "integer",
        "dimensions": [],
        "line": 70,
        "offset": 117,
        "words": 1,
        "assembly": {
          "name": "ttytyp",
          "line": 512,
          "type": "integer"
        }
      },
      "hcpos": {
        "type": "integer",
        "dimensions": [],
        "line": 71,
        "offset": 118,
        "words": 1,
        "assembly": {
          "name": "hcpos",
          "line": 513,
          "type": "integer"
        }
      },
      "icflg": {
        "type": "integer",
        "dimensions": [],
        "line": 72,
        "offset": 119,
        "words": 1,
        "assembly": {
          "name": "icflg",
          "line": 514,
          "type": "integer"
        }
      },
      "ocflg": {
        "type": "integer",
        "dimensions": [],
        "line": 73,
        "offset": 120,
        "words": 1,
        "assembly": {
          "name": "ocflg",
          "line": 515,
          "type": "integer"
        }
      },
      "blank": {
        "type": "integer",
        "dimensions": [],
        "line": 74,
        "offset": 121,
        "words": 1,
        "assembly": {
          "name": "blank",
          "line": 516,
          "type": "integer"
        }
      },
      "llz": {
        "type": "integer",
        "dimensions": [],
        "line": 75,
        "offset": 122,
        "words": 1,
        "assembly": {
          "name": "llz",
          "line": 517,
          "type": "integer"
        }
      },
      "inflag": {
        "type": "integer",
        "dimensions": [],
        "line": 76,
        "offset": 123,
        "words": 1,
        "assembly": {
          "name": "inwait",
          "line": 518,
          "type": "integer"
        }
      },
      "hungup": {
        "type": "integer",
        "dimensions": [],
        "line": 77,
        "offset": 124,
        "words": 1,
        "assembly": {
          "name": "hungup",
          "line": 519,
          "type": "integer"
        }
      },
      "addrck": {
        "type": "integer",
        "dimensions": [],
        "line": 78,
        "offset": 125,
        "words": 1,
        "assembly": {
          "name": "addrck",
          "line": 520,
          "type": "integer"
        }
      },
      "lkfail": {
        "type": "integer",
        "dimensions": [],
        "line": 79,
        "offset": 126,
        "words": 1,
        "assembly": {
          "name": "lkfail",
          "line": 521,
          "type": "integer"
        }
      },
      "terwid": {
        "type": "integer",
        "dimensions": [],
        "line": 80,
        "offset": 127,
        "words": 1,
        "assembly": {
          "name": "terwid",
          "line": 522,
          "type": "integer"
        }
      }
    }
  }
} as const;
