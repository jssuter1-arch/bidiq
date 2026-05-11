import { useEffect, useRef, useState } from 'react';
import api from '@/services/api';

type ModuleAccessMap = Record<string, boolean>;

let _cache: ModuleAccessMap | null = null;
let _inflightPromise: Promise<ModuleAccessMap> | null = null;

function fetchAccessMap(): Promise<ModuleAccessMap> {
  if (_cache) return Promise.resolve(_cache);
  if (_inflightPromise) return _inflightPromise;
  _inflightPromise = api
    .get('/v1/users/me/module-access')
    .then((r) => {
      _cache = r.data.data || {};
      return _cache as ModuleAccessMap;
    })
    .catch(() => ({}));
  return _inflightPromise;
}

export function clearModuleAccessCache() {
  _cache = null;
  _inflightPromise = null;
}

export function useModuleAccess() {
  const [access, setAccess] = useState<ModuleAccessMap>(_cache || {});
  const [loading, setLoading] = useState(!_cache);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (_cache) {
      setAccess(_cache);
      setLoading(false);
      return;
    }
    fetchAccessMap().then((map) => {
      if (mounted.current) {
        setAccess(map);
        setLoading(false);
      }
    });
    return () => { mounted.current = false; };
  }, []);

  return {
    access,
    loading,
    hasAccess: (key: string) => access[key] === true,
  };
}
