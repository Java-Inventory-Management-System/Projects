import axios from "axios"

const BASE = process.env.VITE_BACKEND_URL ?? "http://backend:8888/api/v1"

export async function setup() {
  const admin = await axios.post(`${BASE}/auth/login`, {
    username: "admin", password: "123456",
  })
  const manager = await axios.post(`${BASE}/auth/login`, {
    username: "manager", password: "123456",
  })
  process.env.TEST_TOKEN = admin.data.data.accessToken
  process.env.TEST_MANAGER_TOKEN = manager.data.data.accessToken
}

export async function teardown() {
  // no-op
}
