import {
  CheckIcon,
  ClipboardIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { useContext, useState } from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { lightGray, vscEditorBackground, vscForeground } from "..";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { useWebviewListener } from "../../hooks/useWebviewListener";
import { incrementNextCodeBlockToApplyIndex } from "../../redux/slices/uiStateSlice";
import { getFontSize, isJetBrains } from "../../util";
import FileIcon from "../FileIcon";

const ToolbarDiv = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: inherit;
  font-size: ${getFontSize() - 2}px;
  padding: 3px;
  padding-left: 4px;
  padding-right: 4px;
  border-bottom: 0.5px solid ${lightGray}80;
  margin: 0;
`;

const ToolbarButton = styled.button`
  display: flex;
  align-items: center;
  border: none;
  outline: none;
  background: transparent;

  color: ${vscForeground};
  font-size: ${getFontSize() - 2}px;

  &:hover {
    cursor: pointer;
  }
`;

interface CodeBlockToolBarProps {
  text: string;
  bottom: boolean;
  language: string | undefined;
  isNextCodeBlock: boolean;
  filename?: string;
}

const terminalLanguages = ["bash", "sh"];
const commonTerminalCommands = [
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "deno",
  "npx",
  "cd",
  "ls",
  "pwd",
  "pip",
  "python",
  "node",
  "git",
  "curl",
  "wget",
  "rbenv",
  "gem",
  "ruby",
  "bundle",
];
function isTerminalCodeBlock(language: string | undefined, text: string) {
  return (
    terminalLanguages.includes(language) ||
    ((!language || language?.length === 0) &&
      (text.trim().split("\n").length === 1 ||
        commonTerminalCommands.some((c) => text.trim().startsWith(c))))
  );
}

function CodeBlockToolBar(props: CodeBlockToolBarProps) {
  const ideMessenger = useContext(IdeMessengerContext);
  const [copied, setCopied] = useState<boolean>(false);
  const [applying, setApplying] = useState(false);
  const dispatch = useDispatch();

  // Handle apply keyboard shortcut
  useWebviewListener(
    "applyCodeFromChat",
    async () => {
      await ideMessenger.request("applyToCurrentFile", {
        text: props.text,
      });
      dispatch(incrementNextCodeBlockToApplyIndex({}));
    },
    [props.isNextCodeBlock, props.text],
    !props.isNextCodeBlock,
  );

  function onClickHeader() {
    // TODO: Need to turn into relative or fq path
    ideMessenger.post("showFile", {
      filepath: props.filename,
    });
  }

  function onClickCopy(e) {
    const text = typeof props.text === "string" ? props.text : props.text;
    if (isJetBrains()) {
      ideMessenger.request("copyText", { text });
    } else {
      navigator.clipboard.writeText(text);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function onClickActionButton() {
    if (isTerminalCodeBlock(props.language, props.text)) {
      let text = props.text;
      if (text.startsWith("$ ")) {
        text = text.slice(2);
      }
      ideMessenger.ide.runCommand(text);
      return;
    }

    if (applying) return;
    ideMessenger.post("applyToCurrentFile", {
      text: props.text,
    });
    setApplying(true);
    setTimeout(() => setApplying(false), 2000);
  }

  return (
    <ToolbarDiv>
      <div
        className="flex items-center cursor-pointer py-0.5 px-0.5"
        onClick={onClickHeader}
      >
        {props.filename && (
          <>
            <FileIcon
              filename={props.filename || props.language}
              height="18px"
              width="18px"
            />
            <span className="hover:brightness-125 ml-1">{props.filename}</span>{" "}
          </>
        )}
      </div>

      <div className="flex items-center">
        <ToolbarButton onClick={onClickCopy}>
          <div
            className={`flex items-center gap-1 ] hover:brightness-125 transition-colors duration-200`}
            style={{ color: lightGray }}
          >
            {copied ? (
              <>
                <CheckIcon className="w-3 h-3 text-green-500 hover:brightness-125" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <ClipboardIcon className="w-3 h-3 hover:brightness-125" />
                <span>Copy</span>
              </>
            )}
          </div>
        </ToolbarButton>

        {isJetBrains() || (
          <ToolbarButton
            disabled={applying}
            style={{ backgroundColor: vscEditorBackground }}
            onClick={onClickActionButton}
          >
            <div
              className={`flex items-center gap-1 hover:brightness-125 transition-colors duration-200`}
              style={{ color: lightGray }}
            >
              {applying ? (
                <CheckIcon className="w-3 h-3 text-green-500" />
              ) : (
                <PlayIcon className="w-3 h-3" />
              )}
              <span>
                {isTerminalCodeBlock(props.language, props.text)
                  ? "Run in terminal"
                  : applying
                  ? "Applying..."
                  : "Apply"}
              </span>
            </div>
          </ToolbarButton>
        )}
      </div>
    </ToolbarDiv>
  );
}

export default CodeBlockToolBar;
