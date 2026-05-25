import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { connectNotificationSocket } from '../api/notificationSocket';

function normalizeId(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

function normalizeIdList(values = []) {
  return Array.from(new Set(
    values
      .map(normalizeId)
      .filter(Boolean),
  ));
}

function normalizeUsers(users = []) {
  return Array.isArray(users) ? users : [];
}

function createClientMutationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `mutation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useWorkshopPresenceOverview(workshopIds = []) {
  const workshopIdKey = normalizeIdList(workshopIds).join(',');
  const [presenceByWorkshopId, setPresenceByWorkshopId] = useState({});

  useEffect(() => {
    const ids = workshopIdKey
      .split(',')
      .map(normalizeId)
      .filter(Boolean);

    if (!ids.length) return undefined;

    let socket;
    const watchedIds = new Set(ids.map(String));

    function handleWorkshopPresence({ workshopId, users = [] } = {}) {
      const key = String(workshopId);
      if (!watchedIds.has(key)) return;

      setPresenceByWorkshopId(prev => ({
        ...prev,
        [key]: normalizeUsers(users),
      }));
    }

    socket = connectNotificationSocket({
      onConnected: () => {
        socket?.emit('workshop:watch', { workshopIds: ids });
      },
      onWorkshopPresence: handleWorkshopPresence,
    });

    return () => {
      socket?.emit('workshop:unwatch', { workshopIds: ids });
      socket?.disconnect();
    };
  }, [workshopIdKey]);

  return presenceByWorkshopId;
}

export function useWorkshopSessionPresence(workshopId) {
  const normalizedWorkshopId = normalizeId(workshopId);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!normalizedWorkshopId) return undefined;

    let socket;

    function handleWorkshopPresence({ workshopId: eventWorkshopId, users: presenceUsers = [] } = {}) {
      if (String(eventWorkshopId) !== String(normalizedWorkshopId)) return;
      setUsers(normalizeUsers(presenceUsers));
    }

    socket = connectNotificationSocket({
      onConnected: () => {
        socket?.emit('workshop:join', { workshopId: normalizedWorkshopId });
      },
      onWorkshopPresence: handleWorkshopPresence,
    });

    return () => {
      socket?.emit('workshop:leave', { workshopId: normalizedWorkshopId });
      socket?.disconnect();
    };
  }, [normalizedWorkshopId]);

  return { users };
}

export function useSwotCollaboration(scenarioId) {
  const normalizedScenarioId = normalizeId(scenarioId);
  const socketRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!normalizedScenarioId) return undefined;

    let socket;

    function handleSwotPresence({ scenarioId: eventScenarioId, users: presenceUsers = [] } = {}) {
      if (String(eventScenarioId) !== String(normalizedScenarioId)) return;
      setUsers(normalizeUsers(presenceUsers));
    }

    function handleSwotActivity({ scenarioId: eventScenarioId, activities: activeActivities = [] } = {}) {
      if (String(eventScenarioId) !== String(normalizedScenarioId)) return;
      setActivities(Array.isArray(activeActivities) ? activeActivities : []);
    }

    socket = connectNotificationSocket({
      onConnected: () => {
        socket?.emit('swot:join', { scenarioId: normalizedScenarioId });
      },
      onSwotPresence: handleSwotPresence,
      onSwotActivity: handleSwotActivity,
    });
    socketRef.current = socket;

    return () => {
      socket?.emit('swot:activity:stop', { scenarioId: normalizedScenarioId });
      socket?.emit('swot:leave', { scenarioId: normalizedScenarioId });
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [normalizedScenarioId]);

  const startActivity = useCallback((activity) => {
    if (!normalizedScenarioId || !activity?.quadrant) return;

    socketRef.current?.emit('swot:activity:start', {
      scenarioId: normalizedScenarioId,
      quadrant: activity.quadrant,
      mode: activity.mode || 'typing',
      itemIndex: activity.itemIndex ?? null,
    });
  }, [normalizedScenarioId]);

  const stopActivity = useCallback(() => {
    if (!normalizedScenarioId) return;

    socketRef.current?.emit('swot:activity:stop', {
      scenarioId: normalizedScenarioId,
    });
  }, [normalizedScenarioId]);

  return useMemo(() => ({
    users,
    activities,
    startActivity,
    stopActivity,
  }), [activities, startActivity, stopActivity, users]);
}

export function useRadarCollaboration(workshopId, onRemoteUpdate) {
  const normalizedWorkshopId = normalizeId(workshopId);
  const socketRef = useRef(null);
  const localMutationIdsRef = useRef(new Set());
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const [remoteUpdate, setRemoteUpdate] = useState(null);

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
  }, [onRemoteUpdate]);

  useEffect(() => {
    if (!normalizedWorkshopId) return undefined;

    let socket;

    function handleRadarUpdated(update = {}) {
      if (String(update.workshopId) !== String(normalizedWorkshopId)) return;
      if (update.clientMutationId && localMutationIdsRef.current.has(update.clientMutationId)) return;

      const updateWithReceivedAt = {
        ...update,
        receivedAt: Date.now(),
      };

      setRemoteUpdate(updateWithReceivedAt);
      onRemoteUpdateRef.current?.(updateWithReceivedAt);
    }

    socket = connectNotificationSocket({
      onConnected: () => {
        socket?.emit('workshop:join', { workshopId: normalizedWorkshopId });
      },
      onRadarUpdated: handleRadarUpdated,
    });
    socketRef.current = socket;

    return () => {
      socket?.emit('workshop:leave', { workshopId: normalizedWorkshopId });
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [normalizedWorkshopId]);

  const sendRadarUpdate = useCallback((update = {}) => {
    if (!normalizedWorkshopId || !Array.isArray(update.signals)) return null;

    const clientMutationId = createClientMutationId();
    localMutationIdsRef.current.add(clientMutationId);
    window.setTimeout(() => {
      localMutationIdsRef.current.delete(clientMutationId);
    }, 10000);

    socketRef.current?.emit('radar:update', {
      workshopId: normalizedWorkshopId,
      signals: update.signals,
      action: update.action || 'synced',
      signalId: update.signalId ?? null,
      signalName: update.signalName ?? null,
      clientMutationId,
    });

    return clientMutationId;
  }, [normalizedWorkshopId]);

  return useMemo(() => ({
    remoteUpdate,
    sendRadarUpdate,
  }), [remoteUpdate, sendRadarUpdate]);
}
