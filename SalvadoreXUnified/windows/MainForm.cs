using System;
using System.Drawing;
using System.Drawing.Printing;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SalvadoreXPOS {
    public class MainForm : Form {
        private WebView2 webView;
        private string appUrl = "https://af7ad8c5-eddf-4888-8e69-3274eb62b09e-00-35c0aw0acrtx5.picard.replit.dev";
        
        public MainForm() {
            this.Text = "SalvadoreX POS";
            this.Size = new Size(1400, 900);
            this.WindowState = FormWindowState.Maximized;
            this.BackColor = Color.FromArgb(15, 23, 42);
            webView = new WebView2 { Dock = DockStyle.Fill };
            this.Controls.Add(webView);
            InitWebView();
        }
        
        private async void InitWebView() {
            try {
                var userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SalvadoreXPOS");
                Directory.CreateDirectory(userDataFolder);
                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await webView.EnsureCoreWebView2Async(env);
                webView.CoreWebView2.Settings.IsScriptEnabled = true;
                webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
                webView.CoreWebView2.WebMessageReceived += OnMessage;
                
                string script = @"window.SalvadoreXBridge = { isWindowsDesktop: true, getPrinters: function() { window.chrome.webview.postMessage(JSON.stringify({ action: 'getPrinters' })); }, print: function(name, data) { window.chrome.webview.postMessage(JSON.stringify({ action: 'print', printerName: name, data: data })); } };";
                await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(script);
                webView.CoreWebView2.Navigate(appUrl);
            } catch (Exception ex) {
                MessageBox.Show("Error: " + ex.Message + "\n\nInstala WebView2 de: https://developer.microsoft.com/microsoft-edge/webview2/", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        
        private void OnMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e) {
            try {
                var msg = JObject.Parse(e.WebMessageAsJson.Trim('"').Replace("\\\"", "\""));
                string action = msg["action"]?.ToString();
                if (action == "getPrinters") {
                    var printers = new JArray();
                    foreach (string name in PrinterSettings.InstalledPrinters) {
                        var s = new PrinterSettings { PrinterName = name };
                        printers.Add(new JObject { ["name"] = name, ["isDefault"] = s.IsDefaultPrinter, ["isOnline"] = s.IsValid });
                    }
                    webView.CoreWebView2.PostWebMessageAsString(new JObject { ["type"] = "printers", ["printers"] = printers }.ToString());
                } else if (action == "print") {
                    bool ok = false;
                    try {
                        var doc = new PrintDocument();
                        doc.PrinterSettings.PrinterName = msg["printerName"]?.ToString();
                        string[] lines = (msg["data"]?.ToString() ?? "").Split('\n');
                        int i = 0;
                        doc.PrintPage += (s, ev) => {
                            float y = 0; var font = new Font("Courier New", 10);
                            while (i < lines.Length && y < ev.MarginBounds.Height) {
                                ev.Graphics.DrawString(lines[i++], font, Brushes.Black, ev.MarginBounds.Left, y);
                                y += font.GetHeight(ev.Graphics);
                            }
                            ev.HasMorePages = i < lines.Length;
                        };
                        doc.Print(); ok = true;
                    } catch { }
                    webView.CoreWebView2.PostWebMessageAsString(new JObject { ["type"] = "printResult", ["success"] = ok }.ToString());
                }
            } catch { }
        }
    }
}
