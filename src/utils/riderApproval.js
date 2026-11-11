/**
 * Single source of truth for whether a rider application is approved.
 * Admin may set any of these fields; rider UI must accept all of them.
 */
export function isRiderApproved(profile) {
  if (!profile) return false;
  if (profile.approved === true || profile.riderApproved === true) return true;
  if (profile.applicationStatus === 'approved') return true;
  if (profile.verificationStatus === 'approved') return true;
  return false;
}

export function isRiderPendingReview(profile) {
  if (!profile || isRiderApproved(profile)) return false;
  if (profile.status === 'rejected' || profile.applicationStatus === 'rejected') return false;
  return (
    profile.status === 'pending' ||
    profile.status === 'submitted' ||
    profile.status === 'incomplete' ||
    profile.applicationStatus === 'under_review' ||
    profile.approved === false
  );
}

export function mergeRiderProfile(riderDoc, userDoc, uid) {
  if (!riderDoc && !userDoc) return null;
  const merged = {
    id: uid,
    ...(userDoc || {}),
    ...(riderDoc || {}),
  };
  merged.approved = isRiderApproved(merged);
  return merged;
}

export const RIDER_APPROVAL_FIELDS = {
  status: 'active',
  approved: true,
  riderApproved: true,
  verificationStatus: 'approved',
  applicationStatus: 'approved',
  reuploadEnabled: false,
};
