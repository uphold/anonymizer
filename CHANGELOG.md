# Changelog

## [v6.0.0](https://github.com/uphold/anonymizer/releases/tag/v6.0.0) (2024-12-04)
- Standardize serializer exports [\#84](https://github.com/uphold/anonymizer/pull/84) ([satazor](https://github.com/satazor))
- Add support for glob alike pattern matching [\#83](https://github.com/uphold/anonymizer/pull/83) ([satazor](https://github.com/satazor))

## [v5.2.0](https://github.com/uphold/anonymizer/releases/tag/v5.2.0) (2024-12-04)
- Improve performance [\#86](https://github.com/uphold/anonymizer/pull/86) ([satazor](https://github.com/satazor))

## [v5.1.0](https://github.com/uphold/anonymizer/releases/tag/v5.1.0) (2024-11-08)
- Fix release git config [\#82](https://github.com/uphold/anonymizer/pull/82) ([Americas](https://github.com/Americas))
- Fix yarn install on release script [\#81](https://github.com/uphold/anonymizer/pull/81) ([Americas](https://github.com/Americas))
- Pin traverse@0.6.9 [\#80](https://github.com/uphold/anonymizer/pull/80) ([Americas](https://github.com/Americas))

## [v5.0.2](https://github.com/uphold/anonymizer/releases/tag/v5.0.2) (2024-04-12)
- Update dependencies [\#79](https://github.com/uphold/anonymizer/pull/79) ([Americas](https://github.com/Americas))

## [v5.0.1](https://github.com/uphold/anonymizer/releases/tag/v5.0.1) (2023-12-20)
- Add `publishConfig` to package.json [\#77](https://github.com/uphold/anonymizer/pull/77) ([satazor](https://github.com/satazor))
- Fix publishing to npm as part of the release [\#74](https://github.com/uphold/anonymizer/pull/74) ([satazor](https://github.com/satazor))
- Add GitHub release workflow [\#73](https://github.com/uphold/anonymizer/pull/73) ([diogotorres97](https://github.com/diogotorres97))
- Fix memory leak on objects with variadic keys [\#72](https://github.com/uphold/anonymizer/pull/72) ([satazor](https://github.com/satazor))

## [5.0.0](https://github.com/uphold/anonymizer/releases/tag/v5.0.0) (2023-07-11)
- Add support for serializers [\#64](https://github.com/uphold/anonymizer/pull/64) ([Dakrs](https://github.com/Dakrs))
- Bump uphold-scripts and node on ci workflow [\#67](https://github.com/uphold/anonymizer/pull/67) ([cristianooliveira](https://github.com/cristianooliveira))

## [4.2.1](https://github.com/uphold/anonymizer/releases/tag/v4.2.1) (2022-01-12)
- Add missing dependency on package.json [\#53](https://github.com/uphold/anonymizer/pull/53) ([ramms](https://github.com/ramms))

## [v4.2.0](https://github.com/uphold/anonymizer/releases/tag/v4.2.0) (2021-04-14)
- Group trimmed array keys [\#44](https://github.com/uphold/anonymizer/pull/44) ([nunofgs](https://github.com/nunofgs))

## [v4.1.2](https://github.com/uphold/anonymizer/releases/tag/v4.1.2) (2021-02-18)
- Avoid trimming obfuscated values with different obfuscation techniques [\#43](https://github.com/uphold/anonymizer/pull/43) ([rplopes](https://github.com/rplopes))

## [v4.1.1](https://github.com/uphold/anonymizer/releases/tag/v4.1.1) (2021-02-18)
- Update readme to include trim option [\#42](https://github.com/uphold/anonymizer/pull/42) ([rplopes](https://github.com/rplopes))
- Trim objects with no unredacted values [\#41](https://github.com/uphold/anonymizer/pull/41) ([rplopes](https://github.com/rplopes))

## [v4.1.0](https://github.com/uphold/anonymizer/releases/tag/v4.1.0) (2021-02-17)
- Trim redacted keys [\#39](https://github.com/uphold/anonymizer/pull/39) ([rplopes](https://github.com/rplopes))
- Apply anonymizer to objects only [\#40](https://github.com/uphold/anonymizer/pull/40) ([rplopes](https://github.com/rplopes))

## [v4.0.0](https://github.com/uphold/anonymizer/releases/tag/v4.0.0) (2021-01-21)
- Improve handling of wildcard character [\#38](https://github.com/uphold/anonymizer/pull/38) ([franciscocardoso](https://github.com/franciscocardoso))

## [v3.1.1](https://github.com/uphold/anonymizer/releases/tag/v3.1.1) (2020-11-18)
- Fix obfuscation of class getter methods [\#36](https://github.com/uphold/anonymizer/pull/36) ([nunofgs](https://github.com/nunofgs))

## [v3.1.0](https://github.com/uphold/anonymizer/releases/tag/v3.1.0) (2020-10-22)
- Bump node-fetch from 2.6.0 to 2.6.1 [\#34](https://github.com/uphold/anonymizer/pull/34) ([dependabot[bot]](https://github.com/apps/dependabot))
- Bump handlebars from 4.1.2 to 4.7.6 [\#33](https://github.com/uphold/anonymizer/pull/33) ([dependabot[bot]](https://github.com/apps/dependabot))
- Bump lodash from 4.17.15 to 4.17.19 [\#32](https://github.com/uphold/anonymizer/pull/32) ([dependabot[bot]](https://github.com/apps/dependabot))
- Bump https-proxy-agent from 2.2.2 to 2.2.4 [\#28](https://github.com/uphold/anonymizer/pull/28) ([dependabot[bot]](https://github.com/apps/dependabot))
- Bump acorn from 5.7.3 to 5.7.4 [\#26](https://github.com/uphold/anonymizer/pull/26) ([dependabot[bot]](https://github.com/apps/dependabot))
- Add replacement customizer function [\#35](https://github.com/uphold/anonymizer/pull/35) ([nunofgs](https://github.com/nunofgs))

## [v3.0.0](https://github.com/uphold/anonymizer/releases/tag/v3.0.0) (2020-05-19)
- Add a blacklist with higher priority than whitelist [\#31](https://github.com/uphold/anonymizer/pull/31) ([adisney-up](https://github.com/adisney-up))
- Add instructions to release new versions of the project [\#20](https://github.com/uphold/anonymizer/pull/20) ([waldyrious](https://github.com/waldyrious))
- Replace travis with github test action [\#30](https://github.com/uphold/anonymizer/pull/30) ([nunofgs](https://github.com/nunofgs))
- Remove github package registry [\#29](https://github.com/uphold/anonymizer/pull/29) ([nunofgs](https://github.com/nunofgs))

## [v2.0.0](https://github.com/uphold/anonymizer/releases/tag/v2.0.0) (2020-02-17)
- Add version and release scripts [\#25](https://github.com/uphold/anonymizer/pull/25) ([pedrobranco](https://github.com/pedrobranco))
- Add changelog script [\#24](https://github.com/uphold/anonymizer/pull/24) ([pedrobranco](https://github.com/pedrobranco))
- Handle Buffer obfuscation [\#23](https://github.com/uphold/anonymizer/pull/23) ([pedrobranco](https://github.com/pedrobranco))
- Add lint script and apply lint fixes to codebase [\#19](https://github.com/uphold/anonymizer/pull/19) ([waldyrious](https://github.com/waldyrious))
- Add uphold-scripts [\#17](https://github.com/uphold/anonymizer/pull/17) ([waldyrious](https://github.com/waldyrious))
- Update . notation [\#16](https://github.com/uphold/anonymizer/pull/16) ([Americas](https://github.com/Americas))
- Update package.json [\#15](https://github.com/uphold/anonymizer/pull/15) ([waldyrious](https://github.com/waldyrious))
- Update README [\#13](https://github.com/uphold/anonymizer/pull/13) ([fixe](https://github.com/fixe))
- Update dependencies [\#12](https://github.com/uphold/anonymizer/pull/12) ([fixe](https://github.com/fixe))
- Update license [\#11](https://github.com/uphold/anonymizer/pull/11) ([fixe](https://github.com/fixe))
- Update version to 1.1.1 [\#10](https://github.com/uphold/anonymizer/pull/10) ([fixe](https://github.com/fixe))

## [1.1.1](https://github.com/uphold/anonymizer/releases/tag/v1.1.1) (2019-08-20)
- Fix asterisk regular expression matching [\#8](https://github.com/uphold/anonymizer/pull/8) ([fixe](https://github.com/fixe))

## [1.1.0](https://github.com/uphold/anonymizer/releases/tag/v1.1.0) (2019-08-12)

## [1.0.3](https://github.com/uphold/anonymizer/releases/tag/v1.0.3) (2019-08-12)
- Add support for circular references [\#7](https://github.com/uphold/anonymizer/pull/7) ([fixe](https://github.com/fixe))

## [1.0.2](https://github.com/uphold/anonymizer/releases/tag/v1.0.2) (2019-08-12)

## [1.0.1](https://github.com/uphold/anonymizer/releases/tag/v1.0.1) (2019-08-08)
