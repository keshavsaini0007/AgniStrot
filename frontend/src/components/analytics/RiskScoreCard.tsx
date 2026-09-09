import { motion } from 'framer-motion';
import mine001Img from '@/assets/images/Mine-001-clean.png';
import mine002Img from '@/assets/images/Mine-002-clean.png';
import mine003Img from '@/assets/images/Mine-003-clean.png';
import type { RiskAssessment } from '@/types';

const riskColors = {
  critical: { text: 'text-[#FF4058]', bg: 'bg-[#FF4058]' },
  high: { text: 'text-[#FF4D4F]', bg: 'bg-[#FF4D4F]' },
  medium: { text: 'text-[#F5B942]', bg: 'bg-[#F5B942]' },
  low: { text: 'text-[#35C759]', bg: 'bg-[#35C759]' },
};

const siteImages: Record<string, string> = {
  'mine-001': mine001Img,
  'mine-002': mine002Img,
  'mine-003': mine003Img,
  'mine-004': mine001Img,
  'mine-005': mine002Img,
};

interface RiskScoreCardProps {
  siteId: string;
  assessment: RiskAssessment;
}

export const RiskScoreCard = ({ siteId, assessment }: RiskScoreCardProps) => {
  const colors = riskColors[assessment.riskLevel] ?? riskColors.medium;
  const backgroundImage = siteImages[siteId] ?? mine001Img;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative isolate overflow-hidden bg-[#26343B] border border-[#3A464B] rounded-xl p-4"
    >
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-90"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(23, 26, 29, 0.3), rgba(23, 26, 29, 0.08)), url(${backgroundImage})`,
        }}
      />
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#F4F5F5]">
          {assessment.siteId ? `Site ${assessment.siteId.replace('mine-', '#')}` : 'Site'}
        </span>
        <span className={`text-2xl font-bold ${colors.text}`}>{assessment.riskScore}</span>
      </div>
      <p className={`text-[10px] uppercase tracking-[0.16em] mb-2 ${colors.text}`}>{assessment.riskLevel} risk</p>
      <div className="w-full bg-[#435057] rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full ${colors.bg}`}
          style={{ width: `${assessment.riskScore}%` }}
        />
      </div>
      <div className="space-y-2">
        {assessment.factors.map((factor, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="text-[#8D969B]">{factor.label}</span>
            <span className={`${factor.severity === 'high' ? 'text-[#FF4D4F] italic' : 'text-[#A4ADB2]'}`}>
              {factor.score}%
            </span>
          </div>
        ))}
      </div>
      {assessment.explanation && (
        <p className="text-xs text-[#8D969B] mt-3">{assessment.explanation}</p>
      )}
      {assessment.recommendations.length > 0 && (
        <ul className="mt-3 space-y-1 list-disc pl-4 text-xs text-[#A4ADB2]">
          {assessment.recommendations.slice(0, 2).map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};