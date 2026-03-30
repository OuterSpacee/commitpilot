# Contributing

## Development

```bash
git clone https://github.com/OuterSpacee/auto-commit.git
cd auto-commit
npm install
npm run dev  # runs with tsx
```

## Adding a New Provider

1. Add a new `call<Provider>` function in `src/index.ts`
2. Add the provider to the `generateMessage` switch statement
3. Add a default model in `getDefaultModel`
4. Update the README

## Pull Requests

- Keep changes focused and small
- Test with at least one provider before submitting
- Update README if adding features
