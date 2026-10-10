/** Read a required environment variable, failing with a message that says which one and where to look. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See docs/admin-setup.md.`);
  return value;
}
