import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBusinessStore } from '../stores/useBusinessStore';

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
    socket.on('gemma:start', ({ message }) => addEvent('gemma', message));
    socket.on('gemma:progress', ({ chars }) =>
      addEvent('gemma', `🧠 Gemma still thinking... ${chars} chars generated so far`));
    socket.on('gemma:complete', ({ message, contextLength }) =>
      addEvent('gemma', `${message} (${contextLength} chars)`));
    socket.on('antigravity:start', ({ message, projectPath }) =>
      addEvent('antigravity', message, { projectPath }));
    socket.on('antigravity:model', ({ model, isFallback }) =>
      addEvent('model', `Using model: ${model}${isFallback ? ' (fallback)' : ''}`));
    socket.on('antigravity:fallback', ({ message }) => addEvent('model', message));
    socket.on('antigravity:chunk', ({ text }) => {
      if (text.includes('===FILE:') || text.includes('===END_FILE===')) {
        addEvent('file', text.trim().replace(/===FILE:|===/g, '').trim());
      }
    });
    socket.on('antigravity:file_start', ({ path }) =>
      addEvent('file_start', `📝 Creating: ${path}`));
    socket.on('antigravity:file_written', ({ path, lines }) => {
      addEvent('file_done', `✅ Written: ${path} (${lines} lines)`);
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

  return { sendBuildCommand, sendFollowUp, triggerDeploy, socket: socketInstance };
}
