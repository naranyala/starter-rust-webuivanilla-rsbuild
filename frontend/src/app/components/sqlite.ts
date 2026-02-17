// frontend/src/app/components/sqlite.ts
// SQLite Database window component

export function generateSQLiteHTML(): string {
  return `
    <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; display: flex; flex-direction: column; background: #1e293b;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: #4f46e5;">🗄️ SQLite Database</h2>
        <div style="display: flex; gap: 10px;">
          <button onclick="refreshUsers()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">Refresh Users</button>
        </div>
      </div>

      <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
        <input type="text" id="user-search" placeholder="Search users..." style="flex: 1; padding: 8px 12px; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 6px;">
        <button onclick="addNewUser()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Add User</button>
      </div>

      <div style="flex: 1; overflow: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: rgba(0,0,0,0.3);">
              <th style="padding: 12px; text-align: left; color: #94a3b8;">ID</th>
              <th style="padding: 12px; text-align: left; color: #94a3b8;">Name</th>
              <th style="padding: 12px; text-align: left; color: #94a3b8;">Email</th>
              <th style="padding: 12px; text-align: left; color: #94a3b8;">Role</th>
              <th style="padding: 12px; text-align: left; color: #94a3b8;">Status</th>
              <th style="padding: 12px; text-align: left; color: #94a3b8;">Actions</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            <tr>
              <td colspan="6" style="padding: 20px; text-align: center; color: #64748b;">Loading users...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
        <div style="color: #64748b; font-size: 0.85rem;">
          <span id="user-count">0</span> users | Database: demo.db
        </div>
      </div>
    </div>
  `;
}
