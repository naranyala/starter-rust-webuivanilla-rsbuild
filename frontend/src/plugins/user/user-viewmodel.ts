// frontend/src/plugins/user/user-viewmodel.ts
// User ViewModel for frontend

import { BaseViewModel } from '../../core/plugin';
import type { Result } from '../../core/result';
import { ok, err, AppError } from '../../core/result';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
}

export class UserViewModel extends BaseViewModel {
  readonly name = 'UserViewModel';
  
  private users: User[] = [];
  private selectedUserId: number | null = null;

  constructor() {
    super();
    this.setState('ready');
  }

  async handleCommand(command: string, payload: unknown): Promise<Result<unknown, Error>> {
    switch (command) {
      case 'create_user':
        return this.createUser(payload as { name: string; email: string; role: string });
      case 'delete_user':
        return this.deleteUser(payload as { id: number });
      case 'update_user':
        return this.updateUser(payload as { id: number; name?: string; email?: string; role?: string });
      default:
        return err(AppError.validation(`Unknown command: ${command}`));
    }
  }

  async handleQuery(query: string, params?: Record<string, unknown>): Promise<Result<unknown, Error>> {
    switch (query) {
      case 'get_users':
        return ok(this.users);
      case 'get_user_by_id':
        return this.getUserById(params?.id as number);
      case 'search_users':
        return this.searchUsers(params?.term as string);
      default:
        return err(AppError.validation(`Unknown query: ${query}`));
    }
  }

  private createUser(data: { name: string; email: string; role: string }): Result<unknown, Error> {
    if (!data.name || data.name.trim() === '') {
      return err(AppError.validation('Name is required'));
    }
    if (!data.email || !data.email.includes('@')) {
      return err(AppError.validation('Valid email is required'));
    }
    
    const newUser: User = {
      id: Date.now(),
      name: data.name,
      email: data.email,
      role: data.role || 'user',
      status: 'active',
    };
    this.users.push(newUser);
    this.notify('userCreated', newUser);
    return ok(newUser);
  }

  private deleteUser(data: { id: number }): Result<unknown, Error> {
    const index = this.users.findIndex(u => u.id === data.id);
    if (index >= 0) {
      const deleted = this.users.splice(index, 1)[0];
      this.notify('userDeleted', deleted);
      return ok(undefined);
    }
    return err(AppError.notFound(`User with id ${data.id} not found`));
  }

  private updateUser(data: { id: number; name?: string; email?: string; role?: string }): Result<unknown, Error> {
    const user = this.users.find(u => u.id === data.id);
    if (!user) {
      return err(AppError.notFound(`User with id ${data.id} not found`));
    }
    
    if (data.name) user.name = data.name;
    if (data.email) user.email = data.email;
    if (data.role) user.role = data.role;
    
    this.notify('userUpdated', user);
    return ok(user);
  }

  private getUserById(id: number): Result<unknown, Error> {
    const user = this.users.find(u => u.id === id);
    if (!user) {
      return err(AppError.notFound(`User with id ${id} not found`));
    }
    return ok(user);
  }

  private searchUsers(term: string): Result<unknown, Error> {
    if (!term) {
      return ok(this.users);
    }
    const results = this.users.filter(u => 
      u.name.toLowerCase().includes(term.toLowerCase()) ||
      u.email.toLowerCase().includes(term.toLowerCase())
    );
    return ok(results);
  }

  setUsers(users: User[]): void {
    this.users = users;
    this.notify('usersLoaded', users);
  }

  getUsers(): User[] {
    return this.users;
  }
}

export const userViewModel = new UserViewModel();
