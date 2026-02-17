import { useEffect, useState } from "react";

interface UseFetchSheetsParams {
  worksheetId?: string;
  sheetNames: string[];
}

interface SheetResult {
  data: any[];
  loading: boolean;
  error: string | null;
}

type SheetsState = Record<string, SheetResult>;

export function useFetchSheets({ worksheetId, sheetNames }: UseFetchSheetsParams) {
  const [sheets, setSheets] = useState<SheetsState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!worksheetId || !sheetNames.length) return;

    setLoading(true);
    setError(null);

    const fetchAll = async () => {
      const newSheets: SheetsState = {};
      let anyError: string | null = null;

      await Promise.all(
        sheetNames.map(async (sheetName) => {
          newSheets[sheetName] = { data: [], loading: true, error: null };
          try {
            const url = `/api/sheets/${worksheetId}/${sheetName}`;
            const response = await fetch(url);
            if (!response.ok) {
              const text = await response.text();
              throw new Error(`Failed to fetch ${sheetName}: ${response.status} ${response.statusText} - ${text}`);
            }
            const result = await response.json();
            newSheets[sheetName] = { data: result, loading: false, error: null };
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            newSheets[sheetName] = { data: [], loading: false, error: errorMessage };
            anyError = errorMessage;
          }
        })
      );
      setSheets(newSheets);
      setLoading(false);
      setError(anyError);
    };

    fetchAll();
  }, [worksheetId, JSON.stringify(sheetNames)]);

  return { sheets, loading, error };
}