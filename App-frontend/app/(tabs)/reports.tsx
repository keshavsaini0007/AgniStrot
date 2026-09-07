import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useMines } from '@/hooks/useMines';
import { useInspections } from '@/hooks/useInspections';
import { useObservations } from '@/hooks/useObservations';
import { useCorrectiveActions } from '@/hooks/useCorrectiveActions';
import { useCompliance } from '@/hooks/useCompliance';
import { Card, Badge, Button, KPICard } from '@/components/ui';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getStatusConfig } from '@/utils/status';
import { formatDate } from '@/utils/date';

type ReportType = 'compliance' | 'inspection' | 'violation' | 'risk';

export default function ReportsScreen() {
  const theme = useTheme();
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: minesData } = useMines();
  const { data: inspectionsData } = useInspections();
  const { data: observationsData } = useObservations();
  const { data: actionsData } = useCorrectiveActions();
  const { data: complianceData } = useCompliance();

  const handleGenerate = async (type: ReportType) => {
    setGenerating(true);
    setActiveReport(type);
    // Simulate generation delay
    await new Promise((r) => setTimeout(r, 800));
    setGenerating(false);
  };

  const reportTypes = [
    { type: 'compliance' as ReportType, icon: '📋', title: 'Compliance Report', desc: 'Compliance status across all mines' },
    { type: 'inspection' as ReportType, icon: '🔍', title: 'Inspection Report', desc: 'Inspection summary and findings' },
    { type: 'violation' as ReportType, icon: '⚠️', title: 'Violation Report', desc: 'All violations and corrective actions' },
    { type: 'risk' as ReportType, icon: '📊', title: 'Risk Assessment', desc: 'Risk analysis per mine' },
  ];

  const renderComplianceReport = () => {
    const compliance = complianceData?.data || [];
    const mines = minesData?.data || [];
    return (
      <Card style={styles.reportContent}>
        <View style={styles.reportHeader}>
          <Text style={[styles.reportHeading, { color: theme.text }]}>📋 Compliance Status Report</Text>
          <Text style={[styles.reportDate, { color: theme.textMuted }]}>Generated: {formatDate(new Date().toISOString())}</Text>
        </View>

        <View style={styles.kpiRow}>
          <KPICard title="Total Mines" value={mines.length} icon="⛏️" color={theme.primary} />
          <KPICard title="Compliant" value={compliance.filter((c) => c.status === 'compliant').length} icon="✅" color={theme.success} />
          <KPICard title="Non-Compliant" value={compliance.filter((c) => c.status === 'non_compliant').length} icon="❌" color={theme.danger} />
          <KPICard title="Overdue" value={compliance.filter((c) => c.status === 'overdue').length} icon="⏰" color={theme.warning} />
        </View>

        <Text style={[styles.subHeading, { color: theme.text }]}>Mine Compliance Rates</Text>
        {mines.map((mine) => {
          const rate = mine.complianceRate;
          const color = rate >= 90 ? theme.success : rate >= 75 ? theme.warning : theme.danger;
          return (
            <View key={mine.id} style={[styles.dataRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dataLabel, { color: theme.text }]}>{mine.name}</Text>
              <View style={[styles.progressBar, { backgroundColor: theme.surfaceElevated }]}>
                <View style={[styles.progressFill, { width: `${rate}%`, backgroundColor: color }]} />
              </View>
              <Text style={[styles.dataValue, { color }]}>{rate}%</Text>
            </View>
          );
        })}

        <Text style={[styles.subHeading, { color: theme.text }]}>Compliance Requirements</Text>
        {compliance.map((item) => {
          const cfg = getStatusConfig(item.status);
          return (
            <View key={item.id} style={[styles.dataRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dataLabel, { color: theme.text, flex: 1 }]} numberOfLines={1}>{item.requirement}</Text>
              <Badge label={cfg.label} color={cfg.color} backgroundColor={cfg.bg} size="sm" />
            </View>
          );
        })}
      </Card>
    );
  };

  const renderInspectionReport = () => {
    const inspections = inspectionsData?.data || [];
    const mines = minesData?.data || [];
    const getMineName = (id: string) => mines.find((m) => m.id === id)?.name || 'Unknown';
    return (
      <Card style={styles.reportContent}>
        <View style={styles.reportHeader}>
          <Text style={[styles.reportHeading, { color: theme.text }]}>🔍 Inspection Report</Text>
          <Text style={[styles.reportDate, { color: theme.textMuted }]}>Generated: {formatDate(new Date().toISOString())}</Text>
        </View>

        <View style={styles.kpiRow}>
          <KPICard title="Total" value={inspections.length} icon="📋" color={theme.info} />
          <KPICard title="Completed" value={inspections.filter((i) => i.status === 'completed').length} icon="✅" color={theme.success} />
          <KPICard title="Scheduled" value={inspections.filter((i) => i.status === 'scheduled').length} icon="📅" color={theme.primary} />
          <KPICard title="In Progress" value={inspections.filter((i) => i.status === 'in_progress').length} icon="🔄" color={theme.warning} />
        </View>

        <Text style={[styles.subHeading, { color: theme.text }]}>Inspection Details</Text>
        {inspections.map((insp) => {
          const cfg = getStatusConfig(insp.status);
          return (
            <View key={insp.id} style={[styles.dataRow, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dataLabel, { color: theme.text }]}>{getMineName(insp.mineId)}</Text>
                <Text style={[styles.dataSub, { color: theme.textMuted }]}>{insp.type} • {formatDate(insp.scheduledAt)}</Text>
              </View>
              <Badge label={cfg.label} color={cfg.color} backgroundColor={cfg.bg} size="sm" />
            </View>
          );
        })}
      </Card>
    );
  };

  const renderViolationReport = () => {
    const observations = observationsData?.data || [];
    const actions = actionsData?.data || [];
    return (
      <Card style={styles.reportContent}>
        <View style={styles.reportHeader}>
          <Text style={[styles.reportHeading, { color: theme.text }]}>⚠️ Violation Report</Text>
          <Text style={[styles.reportDate, { color: theme.textMuted }]}>Generated: {formatDate(new Date().toISOString())}</Text>
        </View>

        <View style={styles.kpiRow}>
          <KPICard title="Total Violations" value={observations.length} icon="⚠️" color={theme.danger} />
          <KPICard title="Critical" value={observations.filter((o) => o.severity === 'critical').length} icon="🔴" color={theme.danger} />
          <KPICard title="High" value={observations.filter((o) => o.severity === 'high').length} icon="🟠" color="#FF8C42" />
          <KPICard title="Actions Open" value={actions.filter((a) => a.status !== 'closed' && a.status !== 'resolved').length} icon="📋" color={theme.warning} />
        </View>

        <Text style={[styles.subHeading, { color: theme.text }]}>Violations by Severity</Text>
        {['critical', 'high', 'medium', 'low'].map((sev) => {
          const count = observations.filter((o) => o.severity === sev).length;
          const cfg = getStatusConfig(sev);
          return (
            <View key={sev} style={[styles.dataRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dataLabel, { color: theme.text }]}>{cfg.label}</Text>
              <View style={[styles.progressBar, { backgroundColor: theme.surfaceElevated }]}>
                <View style={[styles.progressFill, { width: observations.length > 0 ? `${(count / observations.length) * 100}%` : '0%', backgroundColor: cfg.color }]} />
              </View>
              <Text style={[styles.dataValue, { color: cfg.color }]}>{count}</Text>
            </View>
          );
        })}

        <Text style={[styles.subHeading, { color: theme.text }]}>Open Violations</Text>
        {observations.filter((o) => o.status === 'open').map((obs) => {
          const sevCfg = getStatusConfig(obs.severity);
          return (
            <View key={obs.id} style={[styles.dataRow, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dataLabel, { color: theme.text }]} numberOfLines={1}>{obs.title}</Text>
                <Text style={[styles.dataSub, { color: theme.textMuted }]}>{obs.category}</Text>
              </View>
              <Badge label={sevCfg.label} color={sevCfg.color} backgroundColor={sevCfg.bg} size="sm" />
            </View>
          );
        })}
      </Card>
    );
  };

  const renderRiskReport = () => {
    const mines = minesData?.data || [];
    return (
      <Card style={styles.reportContent}>
        <View style={styles.reportHeader}>
          <Text style={[styles.reportHeading, { color: theme.text }]}>📊 Risk Assessment Report</Text>
          <Text style={[styles.reportDate, { color: theme.textMuted }]}>Generated: {formatDate(new Date().toISOString())}</Text>
        </View>

        <View style={styles.kpiRow}>
          <KPICard title="Total Mines" value={mines.length} icon="⛏️" color={theme.primary} />
          <KPICard title="High Risk" value={mines.filter((m) => m.riskScore >= 70).length} icon="🔴" color={theme.danger} />
          <KPICard title="Medium Risk" value={mines.filter((m) => m.riskScore >= 40 && m.riskScore < 70).length} icon="🟡" color={theme.warning} />
          <KPICard title="Low Risk" value={mines.filter((m) => m.riskScore < 40).length} icon="🟢" color={theme.success} />
        </View>

        <Text style={[styles.subHeading, { color: theme.text }]}>Mine Risk Scores</Text>
        {mines.sort((a, b) => b.riskScore - a.riskScore).map((mine) => {
          const color = mine.riskScore >= 70 ? theme.danger : mine.riskScore >= 40 ? theme.warning : theme.success;
          const level = mine.riskScore >= 70 ? 'High' : mine.riskScore >= 40 ? 'Medium' : 'Low';
          return (
            <View key={mine.id} style={[styles.dataRow, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dataLabel, { color: theme.text }]}>{mine.name}</Text>
                <Text style={[styles.dataSub, { color: theme.textMuted }]}>{mine.location.address}</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.surfaceElevated }]}>
                <View style={[styles.progressFill, { width: `${mine.riskScore}%`, backgroundColor: color }]} />
              </View>
              <Badge label={`${level} ${mine.riskScore}`} color={color} backgroundColor={color + '20'} size="sm" />
            </View>
          );
        })}

        <Text style={[styles.subHeading, { color: theme.text }]}>Risk Factors per Mine</Text>
        {mines.slice(0, 3).map((mine) => (
          <View key={mine.id} style={[styles.factorBlock, { backgroundColor: theme.surfaceElevated }]}>
            <Text style={[styles.factorTitle, { color: theme.text }]}>{mine.name}</Text>
            <View style={[styles.dataRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>Open Observations</Text>
              <Text style={[styles.dataValue, { color: mine.openObservations > 10 ? theme.danger : theme.text }]}>{mine.openObservations}</Text>
            </View>
            <View style={[styles.dataRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>Overdue Actions</Text>
              <Text style={[styles.dataValue, { color: mine.overdueActions > 3 ? theme.danger : theme.text }]}>{mine.overdueActions}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>Compliance Rate</Text>
              <Text style={[styles.dataValue, { color: mine.complianceRate >= 80 ? theme.success : theme.warning }]}>{mine.complianceRate}%</Text>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  const renderReport = () => {
    switch (activeReport) {
      case 'compliance': return renderComplianceReport();
      case 'inspection': return renderInspectionReport();
      case 'violation': return renderViolationReport();
      case 'risk': return renderRiskReport();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Reports</Text>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Generate Reports</Text>
          {reportTypes.map((report) => {
            const isActive = activeReport === report.type;
            return (
              <Pressable
                key={report.type}
                onPress={() => handleGenerate(report.type)}
                style={({ pressed }) => [
                  styles.reportRow,
                  { borderColor: theme.border },
                  isActive && { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.reportIcon}>{report.icon}</Text>
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportTitle, { color: isActive ? theme.primary : theme.text }]}>{report.title}</Text>
                  <Text style={[styles.reportDesc, { color: theme.textSecondary }]}>{report.desc}</Text>
                </View>
                {generating && isActive ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Badge label={isActive ? 'Viewing' : 'Generate'} color={isActive ? theme.primary : theme.textMuted} backgroundColor={isActive ? theme.primary + '20' : theme.surfaceElevated} size="sm" />
                )}
              </Pressable>
            );
          })}
        </Card>

        {activeReport && !generating && renderReport()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.twelve },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  section: { gap: Spacing.one },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', marginBottom: Spacing.two },
  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
    paddingVertical: Spacing.three, paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  reportIcon: { fontSize: 24 },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: FontSize.md, fontWeight: '600' },
  reportDesc: { fontSize: FontSize.xs },
  reportContent: { gap: Spacing.three },
  reportHeader: { gap: Spacing.one },
  reportHeading: { fontSize: FontSize.lg, fontWeight: '700' },
  reportDate: { fontSize: FontSize.xs },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  subHeading: { fontSize: FontSize.md, fontWeight: '600', marginTop: Spacing.two },
  dataRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    paddingVertical: Spacing.two, borderBottomWidth: 1,
  },
  dataLabel: { fontSize: FontSize.sm, fontWeight: '500', flex: 1 },
  dataValue: { fontSize: FontSize.sm, fontWeight: '600', width: 50, textAlign: 'right' },
  dataSub: { fontSize: FontSize.xs },
  progressBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  factorBlock: { borderRadius: BorderRadius.md, padding: Spacing.three, gap: Spacing.one },
  factorTitle: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.one },
});
