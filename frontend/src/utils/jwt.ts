export function jwtDecode<T>(token: string): T {
  const payload = token.split(".")[1]
  return JSON.parse(atob(payload))
}
