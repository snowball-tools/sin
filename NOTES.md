## Todo
- deferrable shorter removal children are not removed first (deferrableBug)

## Ideas
- Check anchor handling (#wee scroll etc)
- document.querySelector(location.hash).scrollIntoView() on load ? (no need if ssr)
- scroll restoration for async loaded content?
- streaming ssr by waiting for first context.head() call
- Document Cleanup of life if component changes but dom node stays the same (only issue w non keyed)
- document required d:(d colon) for `d` usage in svg to prevent display shorthand
- [s.key]:, [s.dom]:, [s.reload]:
- Add improvement for nested css (make separate classes that are toggled instead of uncached css)
- traverse nonKeyed in reverse too
- iframe island - https://flems.io/#0=N4IgtglgJlA2CmIBcBWA7AOgEwGYA0IAZhAgM7IDaoAdgIZiJIgYAWALmLCAQMYD21NvEHIQIAL54a9RswBW5XgKEimpDFHgAjAK4BzAAQBeA2wBOO+AB1q-aqTYGIhMzOMHSACk-ADdlY7iAJTGAHwGwDYGBmbwbDpm1AaeIUbhpAAGzq4MUdEGWnxmmmYG1ALWSQYZPnnRsM7wSAZQfGBhEXX5XdGkcQAqEAx8OmzeqeGRVfn5dg4ebACeCO6tPDoMghh6cQCiCJtspABCi-20egByMp4A5ADK-QCaADK7t0EUAIwAuhg8sAqlz4mk85ksQR6+QADp5WmB-sphGwAOoQaitADuGj460OrHgtCgGFo0OhwigAGEWCQoJ4HMt4EFIdN8pIDAAGFkzaLwxGCZFojF8bFrDbIjCFKCLDAMhAYMC0Mx6dHuDlQ9RgEaCOFtfkBIVYnF4iVSxZ4PxIwTcnmxeKJZITTqsmbqLSkdRy+DqWJagBu8HpSwQNp5HgV2rGfP8gvRRrF+LNFuoOlgsFDbK64jywRsueoNgQjn4OkEapsmsj4w62RkGTyWh4MXgUBsNSm0RjgmaKQ6mRYXy6jYKsEseXbXQEAIgPAA1j2nSXBABqZc5i23FjwOS3AzLy2ltgs4JBbggfhgaEkeBmURaWhaeBcAh9BA8NgQATkJhfAAcSAAFgkKQQDoBhRH+D0zy7NhRAkH4CAaahZ2-KhQJkURSHRAABR82FoM8Ei4Jh2DYaFSCQAB6SjS2hWc9ERMBKKw6hsK+DAOQ4gBaMweAwABOSitDMEU+jMZj0QwDZiQUM8lnJTCeDMCBoVgl8n3gd9P3sUQ-wANjQJAviwLj9MMr5+PgggwNkWsGAMWhSA8CAAC94EtQRaHRG8JCAA
