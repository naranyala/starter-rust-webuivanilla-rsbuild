// frontend/src/plugins/user/index.ts
// User plugin

import type { Plugin, ViewModelPlugin } from '../../core/plugin';
import type { Result } from '../../core/result';
import { ok } from '../../core/result';
import { userViewModel } from './user-viewmodel';
import type { ViewModel } from '../../core/plugin';

class UserPlugin implements Plugin, ViewModelPlugin {
  readonly name = 'user';
  readonly version = '1.0.0';
  viewModel: ViewModel = userViewModel;

  async initialize(): Promise<Result<void, Error>> {
    console.log(`Initializing ${this.name} plugin v${this.version}`);
    // Add sample users
    userViewModel.setUsers([
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', status: 'active' },
      { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'editor', status: 'inactive' },
    ]);
    return ok(undefined);
  }

  async destroy(): Promise<Result<void, Error>> {
    console.log(`Destroying ${this.name} plugin`);
    return ok(undefined);
  }
}

export const userPlugin = new UserPlugin();
export default userPlugin;
