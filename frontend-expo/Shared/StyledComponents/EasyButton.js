import styled, { css } from "styled-components/native";
import { adminTheme } from "../../assets/common/adminTheme";

const EasyButton = styled.TouchableOpacity`
    flex-direction: row;
    border-radius: 8px;
    padding: 12px;
    margin: 5px;
    justify-content: center;
    background: transparent;

    ${(props) =>
        props.primary &&
        css`
            background: ${adminTheme.colors.primary};
        `}

    ${(props) =>
        props.secondary &&
        css`
            background: ${adminTheme.colors.primaryLight};
        `}

    ${(props) =>
        props.danger &&
        css`
            background: ${adminTheme.colors.error};
        `}

    ${(props) =>
        props.large &&
        css`
            width: 160px;
        `}

    ${(props) =>
        props.medium &&
        css`
            width: 120px;
        `}

    ${(props) =>
        props.small &&
        css`
            width: 50px;
        `}
`;

export default EasyButton;
