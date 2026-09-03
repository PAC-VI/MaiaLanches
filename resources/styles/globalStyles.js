import styled from "styled-components";
import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');

    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;

        font-synthesis: none;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        -webkit-text-size-adjust: 100%;

        font-family: "Plus Jakarta Sans", sans-serif;
        font-optical-sizing: auto;
    }

    :root {
        font-size: 62.5%;

        --white: #fff;
        --white-bg: #f4f7f9;
        --white-bg-darker: #f8fafc;
        --white-hover: #f3f4f6;
        --black: #181f25;
        --main-red: #7b1324;
        --main-red-light: #9c2f42;
        --gray: #6b7280;
        --gray-border: #e2e8f0;
        --gray-border-darker: #cbd5e1;
        --warning-green: #16a34a;
        --warning-yellow: #d97706;
        --warning-yellow-bg: #fef9e7;
        --warning-yellow-text: #92400e;
    }

    body {
        background-color: var(--white-bg);
    }
`;

export const Title = styled.h1 `
    color: var(--black);
    font-size: ${({ fontSize }) => fontSize || '2.4rem'};
    font-weight: ${({ fontWeight }) => fontWeight || 'bold'};
`;

export const NormalText = styled.p`
    font-size: ${({ fontSize }) => fontSize || '1.2rem'};
    font-weight: ${({ fontWeight }) => fontWeight || 400};
    color: ${({ color }) => color || 'var(--gray)'};
`;