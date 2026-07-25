declare namespace JSX {
    interface IntrinsicElements {
        // Raw custom-element tags used directly in JSX (not via @lit/react wrappers).
        // `copyable-text` is removed in the wa-copy-button migration (PR #2).
        'copyable-text': any;
    }
}