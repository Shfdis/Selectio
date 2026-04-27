const defaultCommunityCoverAsset = require('../assets/icons/profile-avatar.png');

export function getCommunityCoverImageSource(coverUrl) {
  if (typeof coverUrl === 'string' && coverUrl.trim().length > 0) {
    return { uri: coverUrl.trim() };
  }
  return defaultCommunityCoverAsset;
}
