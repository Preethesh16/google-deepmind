import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBusinessStore } from '../stores/useBusinessStore';
import { useFeedbackStore } from '../stores/useFeedbackStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socketInstance: Socket | null = null;

export function useSocket() {
  const {
    addBuildEvent, setFilesCreated, setDeployUrl,
    setIsBuilding, setBuildId, filesCreated
  } = useBusinessStore();

  const filesRef = useRef(filesCreated);
  filesRef.current = filesCreated;

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: true
      });
    }

    const socket = socketInstance;

    const addEvent = (type: string, message: string, data?: any) => {
      addBuildEvent({ type, message, timestamp: Date.now(), data });
    };

    // Bind all socket events to store
    socket.on('build:id', ({ buildId }) => { setBuildId(buildId); });
    socket.on('gemma:start', ({ message }) => addEvent('context', message));
    socket.on('gemma:progress', ({ chars }) =>
      addEvent('context', `📋 Compiling context... ${chars} chars`));
    socket.on('gemma:complete', ({ message, contextLength }) =>
      addEvent('context', `${message} (${contextLength} chars)`));
    socket.on('agent:log', ({ agent, message }) => {
      // Map agent names to distinct event types for per-agent icons/colors
      const agentType = (agent || '').toLowerCase();
      const knownTypes = ['coordinator', 'planner', 'builder', 'critic', 'fixer'];
      const type = knownTypes.find(t => agentType.includes(t)) || 'agent';
      addEvent(type, `[${agent}] ${message}`);
    });
    socket.on('antigravity:start', ({ message, projectPath }) =>
      addEvent('antigravity', message, { projectPath }));
    socket.on('antigravity:model', ({ model, isFallback, agent }) =>
      addEvent('model', `${agent ? `[${agent}] ` : ''}Using model: ${model}${isFallback ? ' (fallback)' : ''}`));
    socket.on('antigravity:fallback', ({ message }) => addEvent('model', message));
    socket.on('antigravity:chunk', ({ text }) => {
      if (text.includes('===FILE:') || text.includes('===END_FILE===')) {
        addEvent('file', text.trim().replace(/===FILE:|===/g, '').trim());
      }
    });
    socket.on('antigravity:file_start', ({ path, agent }) =>
      addEvent('file_start', `📝 ${agent ? `[${agent}] ` : ''}Creating: ${path}`));
    socket.on('antigravity:file_written', ({ path, lines, agent }) => {
      addEvent('file_done', `✅ ${agent ? `[${agent}] ` : ''}Written: ${path} (${lines} lines)`);
      setFilesCreated([...filesRef.current, path]);
    });
    socket.on('antigravity:complete', ({ filesCreated: files, message }) => {
      addEvent('complete', message);
      setFilesCreated(files);
      setIsBuilding(false);
    });
    socket.on('antigravity:error', ({ message }) => {
      addEvent('error', `❌ Error: ${message}`);
      setIsBuilding(false);
    });
    socket.on('deploy:start', ({ message }) => addEvent('deploy', message));
    socket.on('deploy:progress', ({ message }) => addEvent('deploy', message));
    socket.on('deploy:complete', ({ url, message }) => {
      addEvent('deploy', message);
      setDeployUrl(url);
      setIsBuilding(false);
    });
    socket.on('build:done', ({ message, deployUrl: url, projectPath }) => {
      addEvent('done', message, { projectPath });
      if (url) setDeployUrl(url);
      setIsBuilding(false);
    });
    socket.on('build:error', ({ message }) => {
      addEvent('error', `❌ ${message}`);
      setIsBuilding(false);
    });

    // ─── Feedback / Fix Center events ────────────────────────────────────────
    socket.on('feedback:updated', ({ item }) => {
      useFeedbackStore.getState().upsertItem(item);
    });
    socket.on('feedback:refreshed', ({ items }) => {
      useFeedbackStore.getState().setItems(items);
    });
    socket.on('feedback:fix_started', ({ feedbackId }) => {
      useFeedbackStore.getState().setActiveFixId(feedbackId);
      setIsBuilding(true);
      addEvent('agent', `🔧 Starting autonomous fix for request #${feedbackId}...`);
    });
    socket.on('feedback:fix_complete', ({ feedbackId, filesChanged }) => {
      addEvent('done', `✅ Fix ready for review — request #${feedbackId} (${filesChanged?.length || 0} file(s)). Awaiting admin approval.`);
      setIsBuilding(false);
      useFeedbackStore.getState().setActiveFixId(null);
    });
    socket.on('feedback:error', ({ feedbackId, message }) => {
      addEvent('error', `❌ Fix failed for request #${feedbackId}: ${message}`);
      setIsBuilding(false);
      useFeedbackStore.getState().setActiveFixId(null);
    });

    // ─── GitHub publish events ────────────────────────────────────────────────
    socket.on('github:start', ({ message }) => addEvent('github', message));
    socket.on('github:progress', ({ message }) => addEvent('github', message));
    socket.on('github:complete', ({ message }) => addEvent('github', message));
    socket.on('github:error', ({ message }) => addEvent('error', `❌ GitHub: ${message}`));

    return () => {
      socket.removeAllListeners();
    };
  }, []);

  const sendBuildCommand = (data: {
    businessId: number;
    command: string;
    autoDeploy: boolean;
    existingProjectPath?: string;
  }) => {
    setIsBuilding(true);
    socketInstance?.emit('build:start', data);
  };

  const sendFollowUp = (data: {
    businessId: number;
    command: string;
    projectPath: string;
  }) => {
    setIsBuilding(true);
    socketInstance?.emit('build:followup', data);
  };

  const triggerDeploy = (data: { projectPath: string; buildId: number }) => {
    socketInstance?.emit('deploy:start', data);
  };

  const fixFeedback = (data: { feedbackId: number; businessId?: number; projectPath?: string }) => {
    setIsBuilding(true);
    socketInstance?.emit('feedback:fix', data);
  };

  const approveFeedback = (data: { feedbackId: number; autoDeploy?: boolean }) => {
    socketInstance?.emit('feedback:approve', data);
  };

  const rejectFeedback = (data: { feedbackId: number }) => {
    socketInstance?.emit('feedback:reject', data);
  };

  const publishToGithub = (data: { projectPath: string; repoName: string; isPrivate?: boolean; buildId?: number }) => {
    socketInstance?.emit('github:publish', data);
  };

  return {
    sendBuildCommand, sendFollowUp, triggerDeploy,
    fixFeedback, approveFeedback, rejectFeedback, publishToGithub,
    socket: socketInstance
  };
}
