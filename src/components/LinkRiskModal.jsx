import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink, X, Globe, CheckCircle2, AlertCircle, Copy, Percent, Info } from 'lucide-react';

export default function LinkRiskModal({ linkData, onClose }) {
  if (!linkData) return null;

  const {
    url,
    domain,
    protocol,
    safePercentage = 0,
    riskPercentage = 0,
    status = 'safe',
    riskFactors = [],
    safeFactors = [],
    scannedAt
  } = linkData;

  const isSafe = status === 'safe';
  const isSuspicious = status === 'suspicious';
  const isDangerous = status === 'dangerous';

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(url);
      alert('URL copied to clipboard');
    } catch {}
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/25 text-red-300 border-red-500/50';
      case 'high':
        return 'bg-orange-500/25 text-orange-300 border-orange-500/50';
      case 'medium':
        return 'bg-amber-500/25 text-amber-300 border-amber-500/50';
      default:
        return 'bg-blue-500/25 text-blue-300 border-blue-500/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-2xl glass-modal rounded-3xl shadow-2xl overflow-hidden border border-gray-700/60 flex flex-col max-h-[92vh] bg-gradient-to-b from-[#0e1720] to-[#070b0f]">
        
        {/* Header */}
        <div className={`p-4 md:p-5 flex items-center justify-between border-b ${
          isDangerous ? 'bg-red-500/10 border-red-500/30' :
          isSuspicious ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-orange-500/10 border-orange-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              isDangerous ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/30' :
              isSuspicious ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30' :
              'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30'
            }`}>
              {isDangerous ? <ShieldAlert className="w-7 h-7 pulse-shield" /> :
               isSuspicious ? <AlertTriangle className="w-7 h-7" /> :
               <ShieldCheck className="w-7 h-7" />}
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                Fraud Link Analysis
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide border ${
                  isDangerous ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                  isSuspicious ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {status}
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-medium">Scanned at {scannedAt || 'Just now'} • AI Fraud Shield Protection</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/80 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-5">
          
          {/* Target URL Preview Card */}
          <div className="p-3.5 bg-gray-900/90 rounded-2xl border border-gray-800 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Globe className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-xs md:text-sm font-mono text-gray-200 truncate select-all">{url}</span>
            </div>
            <button 
              onClick={copyToClipboard}
              className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-gray-800 rounded-lg transition shrink-0 cursor-pointer"
              title="Copy link"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Percentage Risk Gauges */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            
            {/* Safe Percentage Card */}
            <div className="p-4 rounded-2xl bg-gray-900/70 border border-emerald-500/30 text-center relative overflow-hidden shadow-inner">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Safety Index</div>
              <div className="text-3xl md:text-4xl font-black text-emerald-400">{safePercentage}%</div>
              <div className="w-full bg-gray-800 h-2.5 rounded-full mt-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${safePercentage}%` }}
                />
              </div>
            </div>

            {/* Risk Percentage Card */}
            <div className={`p-4 rounded-2xl bg-gray-900/70 text-center relative overflow-hidden border shadow-inner ${
              riskPercentage >= 50 ? 'border-red-500/40' : riskPercentage >= 25 ? 'border-amber-500/30' : 'border-gray-800'
            }`}>
              <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                riskPercentage >= 50 ? 'text-red-400' : riskPercentage >= 25 ? 'text-amber-400' : 'text-gray-400'
              }`}>Risk Index</div>
              <div className={`text-3xl md:text-4xl font-black ${
                riskPercentage >= 50 ? 'text-red-400' : riskPercentage >= 25 ? 'text-amber-400' : 'text-emerald-400'
              }`}>{riskPercentage}%</div>
              <div className="w-full bg-gray-800 h-2.5 rounded-full mt-2.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    riskPercentage >= 50 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-yellow-500 to-amber-500'
                  }`} 
                  style={{ width: `${riskPercentage}%` }}
                />
              </div>
            </div>

          </div>

          {/* Structured Risk Index Table with dedicated Percent and Why-It-Is-Risk Columns */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>Risk Index Breakdown ({riskFactors.length} Factors)</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Heuristic Multi-Layer Analysis</span>
            </div>

            {riskFactors.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-950/70 shadow-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800/90 bg-gray-900/90 text-gray-300 font-extrabold uppercase tracking-wider">
                      <th className="py-3 px-3.5 whitespace-nowrap">Risk Factor</th>
                      <th className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="flex items-center justify-center gap-1 text-red-400 font-bold">
                          <Percent className="w-3 h-3" />
                          Risk (%)
                        </span>
                      </th>
                      <th className="py-3 px-3.5 min-w-[220px]">Why It Is A Risk</th>
                      <th className="py-3 px-3 text-center whitespace-nowrap">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-medium">
                    {riskFactors.map((factor, idx) => (
                      <tr key={idx} className="hover:bg-gray-900/40 transition-colors">
                        <td className="py-3 px-3.5 align-top">
                          <div className="font-bold text-white text-[13px]">{factor.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{factor.desc}</div>
                        </td>
                        <td className="py-3 px-3 text-center align-top whitespace-nowrap">
                          <span className="inline-block px-2 py-1 rounded-lg bg-red-950/50 border border-red-500/30 text-red-400 font-black text-xs">
                            +{factor.impactPercent || 25}%
                          </span>
                        </td>
                        <td className="py-3 px-3.5 align-top text-gray-300 text-xs leading-relaxed">
                          <div className="flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{factor.whyItIsRisk || factor.desc}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center align-top whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getSeverityBadgeClass(factor.severity)}`}>
                            {factor.severity || 'Medium'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-emerald-300">No Threat Signatures Detected</div>
                  <div className="text-xs text-gray-400 mt-0.5">This URL matched verified security baselines with 0 known phishing patterns.</div>
                </div>
              </div>
            )}
          </div>

          {/* Safe Factors Breakdown */}
          {safeFactors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Security Checks Passed</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {safeFactors.map((sf, idx) => (
                  <span key={idx} className="text-xs px-3 py-1 bg-emerald-950/30 text-emerald-300 border border-emerald-500/25 rounded-xl flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
            className="px-4 py-2 text-sm font-bold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition cursor-pointer"
          >
            Close Window
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={copyToClipboard}
              className="px-4 py-2 text-sm font-bold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Link</span>
            </button>
            <a 
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2 text-sm font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                isDangerous 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25' 
                  : 'bg-[#f97316] hover:bg-orange-500 text-white shadow-lg shadow-orange-500/25'
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
