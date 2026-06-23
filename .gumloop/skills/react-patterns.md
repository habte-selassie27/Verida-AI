---
name: react-patterns
description: React patterns and best practices for Verida AI frontend
---

# React Patterns for Verida AI

## Custom Hook Pattern
```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, [execute, options.immediate]);

  return { data, error, isLoading, execute };
}
```

## Wallet Context Pattern
```typescript
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      // Connect to wallet
      const walletAddress = await window.aptos.connect();
      setAddress(walletAddress);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await window.aptos.disconnect();
      setAddress(null);
      setIsConnected(false);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, []);

  return (
    <WalletContext.Provider value={{ isConnected, address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
```

## Form Handling Pattern
```typescript
import { useState, FormEvent } from 'react';
import { z } from 'zod';

interface UseFormOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void>;
}

export function useForm<T>({ schema, onSubmit }: UseFormOptions<T>) {
  const [values, setValues] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (name: keyof T, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name as string]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name as string];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const validatedData = schema.parse(values);
      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return { values, errors, isSubmitting, handleChange, handleSubmit };
}
```

## Data Fetching Pattern
```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseFetchOptions<T> {
  immediate?: boolean;
  initialData?: T;
}

export function useFetch<T>(
  url: string,
  options: UseFetchOptions<T> = {}
) {
  const [data, setData] = useState<T | undefined>(options.initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(options.immediate !== false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (options.immediate !== false) {
      fetchData();
    }
  }, [fetchData, options.immediate]);

  return { data, error, isLoading, refetch: fetchData };
}
```

## Component Composition Pattern
```typescript
// Base Card component
interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>;
}

// Card sub-components
Card.Header = function CardHeader({ children }: { children: ReactNode }) {
  return <div className="card-header">{children}</div>;
};

Card.Body = function CardBody({ children }: { children: ReactNode }) {
  return <div className="card-body">{children}</div>;
};

Card.Footer = function CardFooter({ children }: { children: ReactNode }) {
  return <div className="card-footer">{children}</div>;
};

// Usage
<Card>
  <Card.Header>
    <h3>Dataset Info</h3>
  </Card.Header>
  <Card.Body>
    <p>Details here...</p>
  </Card.Body>
  <Card.Footer>
    <button>Save</button>
  </Card.Footer>
</Card>
```
