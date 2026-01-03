import { useEffect, useState } from "react";

interface UseFetchSheetParams {
  worksheetId?: string;
  sheetName?: string;
}

export function useFetchSheet({ worksheetId, sheetName }: UseFetchSheetParams) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!worksheetId || !sheetName) {
      console.log('useFetchSheet: Missing worksheetId or sheetName', { worksheetId, sheetName });
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const url = `/api/sheets/${worksheetId}/${sheetName}`;
        console.log('useFetchSheet: Fetching from', url);
        
        const response = await fetch(url);
        
        console.log('useFetchSheet: Response status', response.status, response.statusText);
        
        if (!response.ok) {
          const text = await response.text();
          console.error('useFetchSheet: Error response body', text);
          throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('useFetchSheet: Success, received', result.length, 'rows');
        setData(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching sheet data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [worksheetId, sheetName]);

  return {
    data,
    loading,
    error
  };
}
