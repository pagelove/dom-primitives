# Release Checklist for dom-aware-primitives

This document outlines the steps to create a new release.

## Pre-release Checklist

- [ ] All tests pass (`test-suite.html` shows all green)
- [ ] Documentation is up to date
  - [ ] README.md reflects current API
  - [ ] CHANGELOG.md updated with new version
  - [ ] CDN URLs point to correct version tag
- [ ] Code review completed
- [ ] No console errors in example implementations

## Release Steps

1. **Update version references**
   - Update CDN URLs in README.md from previous version to new version tag
   - Update CHANGELOG.md with release date

2. **Run final tests**
   ```bash
   # Open test suite in browser
   open test-suite.html
   
   # Test examples
   open examples/todo-das.html
   ```

3. **Create git tag**
   ```bash
   git add .
   git commit -m "Release v1.0.0"
   git tag -a v1.0.0 -m "Version 1.0.0 - Initial release"
   git push origin main --tags
   ```

4. **Create GitHub Release**
   - Go to https://github.com/jamesaduncan/dom-aware-primitives/releases
   - Click "Create a new release"
   - Choose the tag you just created
   - Title: "v1.0.0 - Initial Release"
   - Copy the CHANGELOG.md content for this version into the description
   - Publish release

5. **Verify CDN availability**
   - Test CDN URLs work correctly:
   ```bash
   curl -I https://cdn.jsdelivr.net/gh/jamesaduncan/dom-aware-primitives@v1.0.0/index.mjs
   curl -I https://cdn.jsdelivr.net/gh/jamesaduncan/dom-aware-primitives@v1.0.0/das-ws.mjs
   ```

## Post-release

- [ ] Announce release (if applicable)
- [ ] Update any dependent projects
- [ ] Monitor for issues

## Version Numbering

Following Semantic Versioning (semver):
- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality additions
- PATCH version for backwards-compatible bug fixes

Current version: 1.0.0