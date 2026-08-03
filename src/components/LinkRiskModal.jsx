import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink, X, Lock, Globe, CheckCircle2, AlertCircle, Copy } from 'lucide-react';

export default function LinkRiskModal({ linkData, onClose }) {
  if (!linkData) return null;

  const {
    url,
    domain,
    protocol,
    safePercentage,
    riskPercentage,
    status,
    riskFactors = [],
    safeFactors = [],
    scannedAt
  } = linkData;

  const isSafe = status === 'safe';
  const isSuspicious = status === 'suspicious';
  const isDangerous = status === 'dangerous';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-modal rounded-2xl shadow-2xl overflow-hidden border border-gray-700/60 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-5 flex items-center justify-between border-b ${
          isDangerous ? 'bg-red-500/10 border-red-500/30' :
          isSuspicious ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-emerald-500/10 border-emerald-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              isDangerous ? 'bg-red-500/20 text-red-400' :
              isSuspicious ? 'bg-amber-500/20 text-amber-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isDangerous ? <ShieldAlert className="w-7 h-7 pulse-shield" /> :
               isSuspicious ? <AlertTriangle className="w-7 h-7" /> :
               <ShieldCheck className="w-7 h-7" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Fraud Link Analysis
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                  isDangerous ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                  isSuspicious ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {status}
                </span>
              </h3>
              <p className="text-xs text-gray-400">Scanned at {scannedAt || 'Just now'}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Target URL Preview Card */}
          <div className="p-3.5 bg-gray-900/80 rounded-xl border border-gray-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-mono text-gray-200 truncate select-all">{url}</span>
            </div>
            <button 
              onClick={copyToClipboard}
              className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition"
              title="Copy link"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Percentage Risk Gauges */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Safe Percentage Card */}
            <div className="p-4 rounded-xl bg-gray-900/60 border border-emerald-500/20 text-center relative overflow-hidden">
              <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-1">Safety Index</div>
              <div className="text-3xl font-extrabold text-emerald-400">{safePercentage}%</div>
              <div className="w-full bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${safePercentage}%` }}
                />
              </div>
            </div>

            {/* Risk Percentage Card */}
            <div className={`p-4 rounded-xl bg-gray-900/60 text-center relative overflow-hidden border ${
              riskPercentage > 50 ? 'border-red-500/30' : 'border-amber-500/20'
            }`}>
              <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${
                riskPercentage > 50 ? 'text-red-400' : 'text-amber-400'
              }`}>Risk Index</div>
              <div className={`text-3xl font-extrabold ${
                riskPercentage > 50 ? 'text-red-400' : 'text-amber-400'
              }`}>{riskPercentage}%</div>
              <div className="w-full bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    riskPercentage > 50 ? 'bg-red-500' : 'bg-amber-500'
                  }`} 
                  style={{ width: `${riskPercentage}%` }}
                />
              </div>
            </div>

          </div>

          {/* Risk Factors Breakdown */}
          {riskFactors.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Detected Risk Factors ({riskFactors.length})
              </h4>
              <div className="space-y-2.5">
                {riskFactors.map((factor, idx) => (
                  <div key={idx} className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <div className="mt-0.5 text-red-400 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-red-300">{factor.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{factor.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safe Factors Breakdown */}
          {safeFactors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Security Checks Passed
              </h4>
              <div className="flex flex-wrap gap-2">
                {safeFactors.map((sf, idx) => (
                  <span key={idx} className="text-xs px-3 py-1 bg-emerald-950/30 text-emerald-300 border border-emerald-500/20 rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {sf}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-gray-900/90 border-t border-gray-800 flex items-center justify-between gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition"
          >
            Close Window
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={copyToClipboard}
              className="px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition flex items-center gap-1.5"
            >
              Copy Link
            </button>
            <a 
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-1.5 ${
                isDangerous 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
              }`}
            >
              <span>{isDangerous ? 'Proceed With Caution' : 'Open Link'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
