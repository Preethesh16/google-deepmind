import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../orbit_secure_db.json');

// Interface for mock database state
interface MockDatabaseState {
  local_secure_vault: any[];
  local_agent_communication_log: any[];
  local_founder_profile: Record<string, string>;
  workspaces: any[];
  context_snapshots: Record<string, string>;
  tasks: any[];
  conflicts: any[];
  audit_logs: any[];
}

class MockDatabase {
  private state: MockDatabaseState;

  constructor() {
    if (existsSync(dbPath)) {
      try {
        this.state = JSON.parse(readFileSync(dbPath, 'utf8'));
      } catch (err) {
        this.state = this.getInitialState();
      }
    } else {
      this.state = this.getInitialState();
      this.save();
    }
  }

  private getInitialState(): MockDatabaseState {
    return {
      local_secure_vault: [],
      local_agent_communication_log: [],
      local_founder_profile: {
        theme: 'dark',
        notifications: 'enabled'
      },
      workspaces: [
        { id: 'default-workspace', name: 'Acme Analytics', owner_id: 'founder-1', status: 'active', created_at: new Date().toISOString() }
      ],
      context_snapshots: {},
      tasks: [],
      conflicts: [],
      audit_logs: []
    };
  }

  private save() {
    writeFileSync(dbPath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  public exec(sql: string) {
    // No-op for mock DB setup commands
  }

  public prepare(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const self = this;

    return {
      get(...args: any[]): any {
        // 1. Check workspace count
        if (normalized.includes('SELECT count(*) as count FROM workspaces')) {
          return { count: self.state.workspaces.length };
        }
        // 2. Fetch context by workspace ID
        if (normalized.includes('SELECT context_data FROM context_snapshots WHERE workspace_id = ?')) {
          const workspaceId = args[0];
          const data = self.state.context_snapshots[workspaceId];
          return data ? { context_data: data } : undefined;
        }
        // 3. Fetch task details
        if (normalized.includes('SELECT * FROM tasks WHERE id = ? AND workspace_id = ?')) {
          const [taskId, workspaceId] = args;
          return self.state.tasks.find(t => t.id === taskId && t.workspace_id === workspaceId);
        }
        return null;
      },

      all(...args: any[]): any[] {
        // 1. Fetch workspaces
        if (normalized.includes('SELECT * FROM workspaces')) {
          return self.state.workspaces;
        }
        // 2. Fetch tasks by workspace
        if (normalized.includes('SELECT * FROM tasks WHERE workspace_id = ?')) {
          const workspaceId = args[0];
          return self.state.tasks.filter(t => t.workspace_id === workspaceId);
        }
        // 3. Fetch agent communication logs
        if (normalized.includes('SELECT * FROM local_agent_communication_log')) {
          return [...self.state.local_agent_communication_log]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 100);
        }
        // 4. Fetch conflicts
        if (normalized.includes('SELECT * FROM conflicts')) {
          return self.state.conflicts;
        }
        // 5. Fetch vault entries
        if (normalized.includes('SELECT * FROM local_secure_vault')) {
          return [...self.state.local_secure_vault]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        return [];
      },

      run(...args: any[]): { changes: number } {
        // 1. Insert workspace
        if (normalized.includes('INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)')) {
          const [id, name, ownerId] = args;
          self.state.workspaces.push({
            id,
            name,
            owner_id: ownerId,
            status: 'active',
            created_at: new Date().toISOString()
          });
          self.save();
          return { changes: 1 };
        }
        // 2. Insert secure vault key
        if (normalized.includes('INSERT INTO local_secure_vault (id, key_type, encrypted_payload) VALUES (?, ?, ?)')) {
          const [id, keyType, encryptedPayload] = args;
          self.state.local_secure_vault.push({
            id,
            key_type: keyType,
            encrypted_payload: encryptedPayload,
            created_at: new Date().toISOString()
          });
          self.save();
          return { changes: 1 };
        }
        // 3. Insert workspace with owner (full fields)
        if (normalized.includes('INSERT INTO workspaces (id, name, owner_id, status) VALUES (?, ?, ?, ?)')) {
          const [id, name, ownerId, status] = args;
          self.state.workspaces.push({
            id,
            name,
            owner_id: ownerId,
            status,
            created_at: new Date().toISOString()
          });
          self.save();
          return { changes: 1 };
        }
        // 4. Insert founder profile preferences
        if (normalized.includes('INSERT INTO local_founder_profile (key, val) VALUES (?, ?)')) {
          const [key, val] = args;
          self.state.local_founder_profile[key] = val;
          self.save();
          return { changes: 1 };
        }
        // 5. Insert context snapshot
        if (normalized.includes('INSERT INTO context_snapshots (workspace_id, context_data) VALUES (?, ?)')) {
          const [workspaceId, contextData] = args;
          self.state.context_snapshots[workspaceId] = contextData;
          self.save();
          return { changes: 1 };
        }
        // 6. Update context snapshot
        if (normalized.includes('UPDATE context_snapshots SET context_data = ?, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?')) {
          const [contextData, workspaceId] = args;
          self.state.context_snapshots[workspaceId] = contextData;
          self.save();
          return { changes: 1 };
        }
        // 7. Insert task log
        if (normalized.includes('INSERT INTO local_agent_communication_log (message_id, sender, recipient, action, payload) VALUES (?, ?, ?, ?, ?)')) {
          const [messageId, sender, recipient, action, payload] = args;
          self.state.local_agent_communication_log.push({
            message_id: messageId,
            sender,
            recipient,
            action,
            payload,
            requires_approval: 0,
            approval_status: 'Pending',
            timestamp: new Date().toISOString()
          });
          self.save();
          return { changes: 1 };
        }
        // 8. Update task status
        if (normalized.includes('UPDATE tasks SET status = ?, started_at = ?, completed_at = ? WHERE id = ? AND workspace_id = ?')) {
          const [status, startedAt, completedAt, id, workspaceId] = args;
          const task = self.state.tasks.find(t => t.id === id && t.workspace_id === workspaceId);
          if (task) {
            task.status = status;
            task.started_at = startedAt;
            task.completed_at = completedAt;
            self.save();
          }
          return { changes: 1 };
        }
        // 9. Insert task
        if (normalized.includes('INSERT INTO tasks (id, workspace_id, title, department, status, dependencies, cost_impact, confidence_score, reasoning, risks, suggested_next, duration_estimate_ms)')) {
          const [id, workspaceId, title, department, status, dependencies, costImpact, confidenceScore, reasoning, risks, suggestedNext, durationEstimateMs] = args;
          self.state.tasks.push({
            id,
            workspace_id: workspaceId,
            title,
            department,
            status,
            dependencies,
            cost_impact: costImpact,
            confidence_score: confidenceScore,
            reasoning,
            risks,
            suggested_next: suggestedNext,
            duration_estimate_ms: durationEstimateMs,
            started_at: null,
            completed_at: null
          });
          self.save();
          return { changes: 1 };
        }
        // 10. Clear tasks for workspace
        if (normalized.includes('DELETE FROM tasks WHERE workspace_id = ?')) {
          const workspaceId = args[0];
          self.state.tasks = self.state.tasks.filter(t => t.workspace_id !== workspaceId);
          self.save();
          return { changes: 1 };
        }
        // 11. Clear agent logs
        if (normalized.includes('DELETE FROM local_agent_communication_log')) {
          self.state.local_agent_communication_log = [];
          self.save();
          return { changes: 1 };
        }
        // 12. Clear conflicts
        if (normalized.includes('DELETE FROM conflicts')) {
          self.state.conflicts = [];
          self.save();
          return { changes: 1 };
        }
        // 13. Insert conflict
        if (normalized.includes('INSERT INTO conflicts (id, workspace_id, party_a, party_b, topic, arguments_a, arguments_b) VALUES (?, ?, ?, ?, ?, ?, ?)')) {
          const [id, workspaceId, partyA, partyB, topic, argumentsA, argumentsB] = args;
          self.state.conflicts.push({
            id,
            workspace_id: workspaceId,
            party_a: partyA,
            party_b: partyB,
            topic,
            arguments_a: argumentsA,
            arguments_b: argumentsB,
            resolution: null,
            status: 'active',
            timestamp: new Date().toISOString()
          });
          self.save();
          return { changes: 1 };
        }
        // 14. Resolve conflict
        if (normalized.includes("UPDATE conflicts SET resolution = ?, status = 'resolved' WHERE id = ?")) {
          const [resolution, conflictId] = args;
          const conflict = self.state.conflicts.find(c => c.id === conflictId);
          if (conflict) {
            conflict.resolution = resolution;
            conflict.status = 'resolved';
            self.save();
          }
          return { changes: 1 };
        }
        return { changes: 0 };
      }
    };
  }
}

export const db = new MockDatabase();
