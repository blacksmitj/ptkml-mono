import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Copy, Users } from "lucide-react";
import { formatPercentage } from "@/lib/utils";

interface ImportStatusCardsProps {
  complete: number;
  failed: number;
  duplicates: number;
  total: number;
}

export function ImportStatusCards({ complete, failed, duplicates, total }: ImportStatusCardsProps) {
  const stats = [
    {
      label: "Total Data",
      value: total,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Berhasil",
      value: complete,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Gagal",
      value: failed,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Duplikasi",
      value: duplicates,
      icon: Copy,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-none bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor} transition-transform group-hover:scale-110 duration-300`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.label === "Total Data" ? "Dari file yang diunggah" : `${formatPercentage((stat.value / (total || 1)) * 100)} dari total`}
            </p>
          </CardContent>
          <div className={`h-1 w-full ${stat.bgColor}`}>
            <div 
              className={`h-full ${stat.color.replace('text-', 'bg-')} transition-all duration-1000 ease-in-out`} 
              style={{ width: `${(stat.value / (total || 1)) * 100}%` }}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
