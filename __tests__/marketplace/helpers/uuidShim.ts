// uuid v11+ ships ESM-only; this shim lets Jest (CJS transform) use Node's crypto instead.
export function v4(): string {
  return crypto.randomUUID()
}
export default { v4 }
