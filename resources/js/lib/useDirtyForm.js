import { useRef } from 'react';

// Na criação, o snapshot é o formulário vazio (ou com os padrões).
// Na edição, é o valor original. true quando o usuário mudou algo.
export function useDirtyForm(current) {
    const initialRef = useRef(null);
    const serialized = JSON.stringify(current);

    if (initialRef.current === null) {
        initialRef.current = serialized;
    }

    return serialized !== initialRef.current;
}
