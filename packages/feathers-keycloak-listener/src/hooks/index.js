import { createUser, updateUser, deleteUser } from './hooks.users.js'
import { setSession, unsetSession } from './hooks.sessions.js'

export const hooks = {
  createUser,
  updateUser,
  deleteUser,
  setSession,
  unsetSession
}
