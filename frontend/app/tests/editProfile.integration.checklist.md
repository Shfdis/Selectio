# EditProfile Integration Checklist

Run these checks with backend data and an authenticated user.

1. Open `editProfile` from `Profile` and verify initial username/description/avatar are prefilled from backend profile data.
2. Change username/description and save; verify `PUT /api/users/profile` succeeds and `Profile` reflects changes.
3. Pick a new avatar from gallery and save; verify image upload to `POST /api/images` succeeds before profile update.
4. Verify saved `avatarUrl` is persisted and shown after navigating back to `Profile`.
5. Restart app and verify updated profile fields and avatar remain server-backed.
6. Verify logout confirmation clears session and navigates back to `home`.
