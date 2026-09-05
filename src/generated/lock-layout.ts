// Generated from WARMAC lock state between checked I/O and STABUF anchors.
export const lockLayout = {
  "file": "WARMAC.MAC",
  "address": 2549,
  "words": 174,
  "maximum": 20,
  "mapLine": 743,
  "fields": {
    "tobcb": {
      "offset": 0,
      "words": 3,
      "line": 663,
      "dimensions": [
        {
          "lower": 0,
          "length": 3
        }
      ]
    },
    "tobuf": {
      "offset": 3,
      "words": 3,
      "line": 664,
      "dimensions": [
        {
          "lower": 0,
          "length": 3
        }
      ]
    },
    "ttyBuffer": {
      "offset": 6,
      "words": 40,
      "line": 665,
      "dimensions": [
        {
          "lower": 0,
          "length": 40
        }
      ]
    },
    "frebie": {
      "offset": 46,
      "words": 1,
      "line": 667,
      "dimensions": []
    },
    "ftlerr": {
      "offset": 47,
      "words": 1,
      "line": 668,
      "dimensions": []
    },
    "locked": {
      "offset": 48,
      "words": 1,
      "line": 669,
      "dimensions": []
    },
    "svlock": {
      "offset": 49,
      "words": 1,
      "line": 670,
      "dimensions": []
    },
    "whohas": {
      "offset": 50,
      "words": 3,
      "line": 671,
      "dimensions": [
        {
          "lower": 0,
          "length": 3
        }
      ]
    },
    "loktab": {
      "offset": 53,
      "words": 20,
      "line": 672,
      "dimensions": [
        {
          "lower": 0,
          "length": 20
        }
      ]
    },
    "jsqwho": {
      "offset": 73,
      "words": 1,
      "line": 673,
      "dimensions": []
    },
    "timsta": {
      "offset": 74,
      "words": 50,
      "line": 674,
      "dimensions": [
        {
          "lower": 0,
          "length": 50
        }
      ]
    },
    "timlcn": {
      "offset": 124,
      "words": 50,
      "line": 675,
      "dimensions": [
        {
          "lower": 0,
          "length": 50
        }
      ]
    }
  }
} as const;
