import { supabase, rpc } from './supabase';
import { changesBetween, emptyWorkspace } from './records';
export async function loadWorkspace(workspaceId) {
  return rpc('jastip_load_workspace', { p_workspace: workspaceId || null });
}
export async function loadStorefront(slug) {
  const data = await rpc('jastip_storefront', { p_slug: slug });
  return { ...emptyWorkspace(), ...data, role: 'Buyer' };
}
async function upload(dataUrl, workspaceId, bucket, kind) {
  if (!dataUrl?.startsWith('data:')) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${workspaceId}/${kind}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw Error(error.message);
  return bucket === 'jastip-products'
    ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    : { bucket, path };
}
async function prepareRecord(record, workspaceId, kind) {
  const out = structuredClone(record);
  if (kind === 'items')
    out.photos = await Promise.all(
      (out.photos || []).map((photo) => upload(photo, workspaceId, 'jastip-products', kind)),
    );
  for (const field of ['proof', 'receipt'])
    if (out[field]?.preview?.startsWith('data:')) {
      const stored = await upload(out[field].preview, workspaceId, 'jastip-proofs', kind);
      out[field] = { name: out[field].name, ...stored };
    }
  if (out.payments)
    out.payments = out.payments.map((p) => ({
      ...p,
      proof: p.proof?.preview?.startsWith('data:') ? out.proof : p.proof,
    }));
  return out;
}
export async function commitWorkspace(previous, next, message) {
  const changes = changesBetween(previous, next);
  const prepared = [];
  for (const change of changes)
    prepared.push({
      ...change,
      data: await prepareRecord(change.data, previous.workspaceId, change.kind),
    });
  const shop = JSON.stringify(previous.shop) === JSON.stringify(next.shop) ? null : next.shop;
  const result = await rpc('jastip_commit', {
    p_workspace: previous.workspaceId,
    p_revision: previous.revision,
    p_changes: prepared,
    p_shop: shop,
    p_event: message || 'Workspace updated.',
  });
  return { ...result, preferences: next.preferences };
}
export async function proofUrl(proof) {
  if (proof.preview) return proof.preview;
  const { data, error } = await supabase.storage.from(proof.bucket).createSignedUrl(proof.path, 60);
  if (error) throw Error(error.message);
  return data.signedUrl;
}
export async function placePublicOrder(slug, order) {
  return rpc('jastip_place_order', { p_slug: slug, p_order: order });
}
export async function trackPublicOrder(token) {
  return rpc('jastip_track_order', { p_token: token });
}
// Public address of the web app. Set VITE_PUBLIC_APP_URL (e.g. https://jastip.vercel.app/) so
// links built inside the Android app point to the website instead of https://localhost.
export const appBase = () => {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL;
  return configured ? configured.replace(/\/?$/, '/') : location.origin + location.pathname;
};
export const inviteLink = (id) => `${appBase()}#invite/${id}`;
export async function inviteMember(workspaceId, email, role) {
  const id = await rpc('jastip_invite_member', {
    p_workspace: workspaceId,
    p_email: email,
    p_role: role,
  });
  return { id, link: inviteLink(id) };
}
// Emails the invitee a Supabase sign-in link that brings them back with ?invite=<id>.
// Creates their account if needed (email verified by the link itself).
export async function sendInviteEmail(email, id) {
  if (!supabase) throw Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${appBase()}?invite=${encodeURIComponent(id)}`,
      data: { invited: true },
    },
  });
  if (error) throw Error(error.message);
}
export async function adminAction(workspaceId, action, value) {
  return rpc('jastip_admin_action', { p_workspace: workspaceId, p_action: action, p_value: value });
}
