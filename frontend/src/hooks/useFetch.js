import { useCallback, useEffect, useState } from 'react';

export const useFetch = (serviceFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceFunction();
      setData(response.data?.data ?? response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData, setData };
};
