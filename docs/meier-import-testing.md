# Meier import regression tests

The API test suite covers the supplier fetch, metadata identity, field extraction
and the complete import-preview controller flow. Tests run without live shop access.

## Captured product pages

`apps/api/test/fixtures/meier/` contains compact HTML fixtures. The five newer
captures retain the importer-relevant DOM and product metadata from 2026-10-14;
unrelated page markup and metadata descriptions are omitted. Source URLs and capture
dates are recorded in each fixture. Older Söhngen and Sarstedt captures remain covered.

`regression-cases.json` records manually reviewed expected fields for the newer pages.
It verifies original article numbers, manufacturer numbers, leading-zero barcodes,
selected variants, gross prices, package counts and medical-device flags together.
Do not regenerate expected values from importer output: compare them against the
supplier's visible product details and metadata. Price assertions refer to captured
pages and do not assert that current live prices remain unchanged.

When a new page format fails, capture its relevant markup, add a failing regression
and fix the importer. Keep other variants in product-group fixtures so tests can
catch incorrect variant selection. Never copy group identifiers into individual
variants merely to satisfy an assertion.

## Boundary cases

Dedicated suites cover graph metadata, broken metadata blocks, canonical mismatches,
missing identities, unknown medical-device status, missing VAT evidence, packaging
ambiguity, redirects, transport failures, interrupted streams and response-size limits.

Run the Meier suites with:

```sh
npm test -w @rescuebase/api -- --runInBand --testPathPatterns=meier
```

GitHub CI already runs these tests with the complete API suite; no additional
workflow or network dependency is needed.
