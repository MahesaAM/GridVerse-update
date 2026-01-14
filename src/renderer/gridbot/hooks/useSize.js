import { useState, useLayoutEffect, useRef } from 'react';

export function useSize() {
    const ref = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        if (!ref.current) return;

        // Initial measure
        const measure = () => {
            const rect = ref.current.getBoundingClientRect();
            setSize({ width: rect.width, height: rect.height });
        };
        measure();

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Use contentRect for precise content box size
                setSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return [ref, size];
}
