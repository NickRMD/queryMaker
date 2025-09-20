# How will updates be handled?

Fisrt I'll clarify branch names:
- `main` is the production branch, it should always be stable and deployable.
- `rc` is the release candidate branch, it is used for testing new features before they are merged into `main`.
- `beta` is the beta branch, it is used for testing new features before they are merged into `rc`.
- `dev` is the development branch, it is used for active development and may be unstable

## Update Strategy
1. **Development Phase**:
   - All new features and bug fixes are developed in the `dev` branch.
   - Regular commits and pushes to `dev` to ensure changes are tracked.
   - Once a feature or fix is complete, it is merged into the `beta` branch for initial testing.
2. **Beta Testing Phase**:
   - The `beta` branch is published into npm with the `beta` tag.
   - Beta testers and early adopters can install the beta version using `npm install sqm@beta`.
   - Feedback from beta testers is collected and any issues are addressed in the `dev` branch.
   - Once the beta version is stable and all critical issues are resolved, it is merged into the `rc` branch.
3. **Release Candidate Phase**:
   - The `rc` branch is published into npm with the `rc` tag.
   - Further testing is conducted to ensure stability and performance.
   - Any final bugs or issues are fixed in the `dev` branch and merged into `rc`.
   - Once the release candidate is deemed stable, it is merged into the `main` branch.
4. **Production Release Phase**:
   - The `main` branch is published into npm with the `latest` tag.
   - Users can install the stable version using `npm install sqm`.
   - Post-release monitoring is conducted to ensure the release is functioning as expected.
   - Any critical issues found in production are addressed in the `dev` branch and the cycle repeats.

## Hotfixes
In case of critical bugs in the `main` branch:
1. Create a hotfix branch from `main`.
2. Implement the fix and test it thoroughly.
3. Merge the hotfix branch back into `main`, `rc`, and `dev` branches.
4. Publish the updated `main` branch and other branches as necessary.
5. Communicate the hotfix to users if necessary.

## Communication
- Regular updates will be communicated through GitHub releases, project documentation, and community channels.
- Users will be informed about new features, bug fixes, and any breaking changes (mostly seen in major releases) in advance.
- Feedback channels will be established for users to report issues and suggest improvements.

## Versioning
- Semantic Versioning (SemVer) will be followed for all releases.
- Major releases will include breaking changes, minor releases will add new features without breaking existing functionality, and patch releases will address bug fixes and minor improvements.
- Version numbers will be updated accordingly in the `package.json` file before each release.

## Think something is wrong with this strategy?
Please open an issue or a discussion on the GitHub repository to share your thoughts and suggestions.

## Why so complex?
As this is a SQL query builder:
- Stability is crucial, especially for production environments.
- Users may rely on specific features or behaviors, so careful testing and versioning are necessary to avoid disruptions.
- A structured update strategy helps maintain quality and trust in the project.
