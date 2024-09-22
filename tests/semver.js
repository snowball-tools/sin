import t from 'sin/test'
import {
  serializeVersion,
  serializeRanges,
  parseVersion,
  buildRanges,
  satisfies,
  best
} from '../bin/install/semver.js'

t`semver`(
  t`versions`({
    run(x, test) {
      return typeof x === 'string'
        ? [x, serializeVersion(parseVersion(test.name))]
        : x
    }
  },
    t`simple`(
      t`1.2.3`('1.2.3'),
      t`1.2`('1.2.0'),
      t`1`('1.0.0')
    ),

    t`prerelease`(
      t`1.2.3-alpha`('1.2.3-alpha'),
      t`1.2.3-alpha.2`('1.2.3-alpha.2'),
      t`release is ''`(() => ['', parseVersion('1.2.3').pre])
    ),

    t`build`(
      t`1.2.3+wat`('1.2.3+wat'),
      t`1.2.3+wat.2`('1.2.3+wat.2'),
      t`build is ''`(() => ['', parseVersion('1.2.3').build])
    ),

    t`weird npm`(
      t`1.1.1rc.1`('1.1.1-rc.1')
    )
  ),

  t`ranges`({
    run(x, test) {
      return [x, serializeRanges(buildRanges(test.name))]
    }
  },
    t`hyphenated`(
      t`1.2.3 - 2.3.4`('>=1.2.3 <2.3.5'),
      t`1.2.3 - 2.3`  ('>=1.2.3 <2.4.0'),
      t`1.2.3 - 2`    ('>=1.2.3 <3.0.0')
    ),

    t`wildcards`(
      t`*`    ('>=0.0.0'),
      t`x`    ('>=0.0.0'),
      t`X`    ('>=0.0.0'),
      t`1.*`  ('>=1.0.0 <2.0.0'),
      t`1.*.*`('>=1.0.0 <2.0.0'),
      t`1.1.*`('>=1.1.0 <1.2.0')
    ),

    t`caret`(
      t`^1.2.3`('>=1.2.3 <2.0.0'),
      t`^0.2.3`('>=0.2.3 <0.3.0'),
      t`^0.0.3`('>=0.0.3 <0.0.4'),
      t`^1.2.3-beta.2`('>=1.2.3-beta.2 <2.0.0'),
      t`^0.0.3-beta`('>=0.0.3-beta <0.0.4'),
      t`^1.2.x`('>=1.2.0 <2.0.0'),
      t`^0.0.x`('>=0.0.0 <0.1.0'),
      t`^0.0`('>=0.0.0 <0.1.0'),
      t`^1.x`('>=1.0.0 <2.0.0'),
      t`^0.x`('>=0.0.0 <1.0.0')
    ),

    t`tilde`(
      t`~1.2.3`('>=1.2.3 <1.3.0'),
      t`~1.2`  ('>=1.2.0 <1.3.0'),
      t`~1`    ('>=1.0.0 <2.0.0'),
      t`~0.2.3`('>=0.2.3 <0.3.0'),
      t`~0.2`  ('>=0.2.0 <0.3.0'),
      t`~0`    ('>=0.0.0 <1.0.0'),
      t`~1.2.3-beta.2`('>=1.2.3-beta.2 <1.3.0')
    ),

    t`operators`(
      t`<1.2.3`('<1.2.3'),
      t`<1.2`('<1.2.0'),
      t`<1`('<1.0.0'),
      t`<=1.2.3`('<1.2.4'),
      t`<=1.2`('<1.2.1'),
      t`<=1`('<1.0.1'),
      t`>1.2.3`('>=1.2.4'),
      t`>1.2`('>=1.2.1'),
      t`>1`('>=1.0.1'),
      t`>=1.2.7`('>=1.2.7'),
      t`>=1.2`('>=1.2.0'),
      t`>=1`('>=1.0.0'),
      t`=1.2.6`('>=1.2.6 <1.2.7'),
      t`=1.2`('>=1.2.0 <1.2.1'),
      t`=1`('>=1.0.0 <1.0.1')
    ),

    t`multiple`(
      t`>1.0 >2.0.0-prerelease+build`('>=1.0.1 >=2.0.1-prerelease+build'),
      t`>= 2.1.2 < 3`('>=2.1.2 <3.0.0')
    )
  ),

  t`satisfies`({
    run(_, test) {
      const [version, expect, range] = test.name.split(/ ([!=]) /)
      const got = satisfies(parseVersion(version), buildRanges(range))
      return [(expect === '='), got]
    }
  },
    t`1.2.3 = 1.2.3`,
    t`1.2.3 = ^1.2.3`,
    t`1.2.2 ! ^1.2.3`,
    t`1.2.2 = ^1.2.3 || 1.2.2`,
  ),

  t`best match`({
    run: (xs, test) => {
      const [range, expect] = test.name.split(' = ')
      return [expect, '' + best(range, xs.split(','))]
    }
  },
    t`1.2.3 = 1.2.3`                        ('1.0.0,1.2.3,1.2.4'),
    t`^1.2.3 = 1.3.4`                       ('1.2.3,1.2.4,1.3.0,1.3.4'),
    t`^1.2.3 = undefined`                   (''),
    t`^1.2.3 || 1.2.2 = 1.2.5`              ('1.0.0,1.2.2,1.2.5'),
    t`^1 = 1.3.4`                           ('1.2.3,1.3.4,2.0.0,2.1.1'),
    t`~1.2.3-beta.2 = 1.2.3-beta.3`         ('1.2.3-alpha.1,1.2.3-beta.2,1.2.3-beta.3'),
    t`~1.2.3-beta.2 = 1.2.3-beta.3`         ('1.2.3-alpha.1,1.2.3-beta.2,1.2.3-beta.3'),
    t`>=1.2.3-beta.2 <1.3.0 = 1.2.3-beta.3` ('1.2.3-alpha.1,1.2.3-beta.2,1.2.3-beta.3'),
    t`>=1.2.3-beta.2 <1.3.0 = 1.2.5`        ('1.2.3-alpha.1,1.2.3-beta.2,1.2.3-beta.3,1.2.5'),
    t`>=1.2.3-beta.2 <1.3.0 = 1.2.3-beta.2` ('1.2.3-beta.2,1.2.4-beta.2'),
    t`15 = 15.1.1`                          ('15.1.1,15.0.0-canary.161.tgz')
  )
)
