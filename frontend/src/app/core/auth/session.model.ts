import type { User } from '../../features/admin/users/user.model';
import type { Project } from '../../features/projects/project.model';
export interface Session {
  user: User;
  projects: Project[];
}
export interface LoginInput {
  username: string;
  password: string;
}
export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}
