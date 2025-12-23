const BASE = 'http://localhost:3000'
const operator = { email: 'operator@shiftmaster.dev', password: 'SecurePassword123!' }
const manager = { email: 'manager@shiftmaster.dev', password: 'SecurePassword123!' }

async function login(creds) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds)
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, body: json }
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let parsed
  try { parsed = JSON.parse(text) } catch (e) { parsed = text }
  return { status: res.status, body: parsed }
}

async function run() {
  console.log('Logging in operator...')
  const op = await login(operator)
  if (op.status !== 200) { console.error('Operator login failed', op); return }
  const opToken = op.body.token
  console.log('Operator token received')

  console.log('Logging in manager...')
  const mg = await login(manager)
  if (mg.status !== 200) { console.error('Manager login failed', mg); return }
  const mgToken = mg.body.token
  console.log('Manager token received')

  // Operator tries to update approved shift (shift-2)
  console.log('\n1) Operator updates approved shift (shift-2)')
  let r = await api('PATCH', '/api/shifts/shift-2', opToken, { hours: 9 })
  console.log('Status:', r.status, 'Body:', r.body)

  // Operator tries to delete approved shift (shift-2)
  console.log('\n2) Operator deletes approved shift (shift-2)')
  r = await api('DELETE', '/api/shifts/shift-2', opToken)
  console.log('Status:', r.status, 'Body:', r.body)

  // Operator updates pending shift (shift-1)
  console.log('\n3) Operator updates pending shift (shift-1)')
  r = await api('PATCH', '/api/shifts/shift-1', opToken, { hours: 7.5 })
  console.log('Status:', r.status, 'Body:', r.body)

  // Operator deletes pending shift (shift-1)
  console.log('\n4) Operator deletes pending shift (shift-1)')
  r = await api('DELETE', '/api/shifts/shift-1', opToken)
  console.log('Status:', r.status, 'Body:', r.body)

  // Manager sets overrideEdit = true on shift-2
  console.log('\n5) Manager sets overrideEdit=true on shift-2')
  r = await api('PATCH', '/api/shifts/shift-2/override-edit', mgToken, { overrideEdit: true })
  console.log('Status:', r.status, 'Body:', r.body)

  // Operator updates approved shift (shift-2) after override
  console.log('\n6) Operator updates approved shift (shift-2) after override')
  r = await api('PATCH', '/api/shifts/shift-2', opToken, { hours: 6.5 })
  console.log('Status:', r.status, 'Body:', r.body)

  // Operator deletes approved shift (shift-2) after override
  console.log('\n7) Operator deletes approved shift (shift-2) after override')
  r = await api('DELETE', '/api/shifts/shift-2', opToken)
  console.log('Status:', r.status, 'Body:', r.body)

  console.log('\nPermission tests complete')
}

run().catch(e => { console.error('Test script error', e); process.exit(1) })
