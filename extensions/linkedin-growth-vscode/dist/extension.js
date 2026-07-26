"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
class ControlCenterProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren() {
        const config = vscode.workspace.getConfiguration("autolink");
        const apiBaseUrl = config.get("apiBaseUrl", "http://localhost:8000");
        try {
            const response = await fetch(`${apiBaseUrl}/agents/status`);
            const agents = (await response.json());
            return agents.map((agent) => {
                const item = new vscode.TreeItem(`${agent.name} (${agent.status})`, vscode.TreeItemCollapsibleState.None);
                item.description = agent.details;
                return item;
            });
        }
        catch {
            return [new vscode.TreeItem("API unavailable")];
        }
    }
}
function activate(context) {
    const provider = new ControlCenterProvider();
    vscode.window.registerTreeDataProvider("autolink.controlCenter", provider);
    const connectApi = vscode.commands.registerCommand("autolink.connectApi", async () => {
        const value = await vscode.window.showInputBox({
            prompt: "Autolink API base URL",
            value: "http://localhost:8000"
        });
        if (!value) {
            return;
        }
        await vscode.workspace.getConfiguration("autolink").update("apiBaseUrl", value, true);
        provider.refresh();
        vscode.window.showInformationMessage(`Autolink API connected: ${value}`);
    });
    const runStrategy = vscode.commands.registerCommand("autolink.runStrategy", async () => {
        const config = vscode.workspace.getConfiguration("autolink");
        const apiBaseUrl = config.get("apiBaseUrl", "http://localhost:8000");
        try {
            const response = await fetch(`${apiBaseUrl}/agents/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agent_type: "strategy",
                    payload: { organization_id: 1 }
                })
            });
            if (!response.ok) {
                throw new Error("failed");
            }
            const data = (await response.json());
            vscode.window.showInformationMessage(`Strategy agent run started: #${data.run_id}`);
            provider.refresh();
        }
        catch {
            vscode.window.showErrorMessage("Could not start Strategy agent run.");
        }
    });
    const openDashboard = vscode.commands.registerCommand("autolink.openDashboard", async () => {
        await vscode.env.openExternal(vscode.Uri.parse("http://localhost:3000"));
    });
    context.subscriptions.push(connectApi, runStrategy, openDashboard);
}
function deactivate() {
    return;
}
//# sourceMappingURL=extension.js.map