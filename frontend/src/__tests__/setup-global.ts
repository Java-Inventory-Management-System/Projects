import axios from "axios"

export async function setup() {
  const admin = await axios.post("http://localhost:8888/api/v1/auth/login", {
    username: "admin", password: "123456",
  })
  process.env.TEST_TOKEN = admin.data.data.accessToken

  const manager = await axios.post("http://localhost:8888/api/v1/auth/login", {
    username: "manager", password: "123456",
  })
  process.env.TEST_MANAGER_TOKEN = manager.data.data.accessToken
}

export async function teardown() {
  delete process.env.TEST_TOKEN
  delete process.env.TEST_MANAGER_TOKEN
}
