import { ActivityRowData } from "../../ActivityInterface";
import { CustomCard } from "@/components/ui_compound/cards/CustomCard";

interface ActivityCardsProps {
  data: ActivityRowData[];
}

export const ActivityCards = ({ data }: ActivityCardsProps) => {
  return (
    <div className="flex flex-wrap gap-4 p-2">
      <div className="flex-1 min-w-[250px] basis-[calc(33.333%-1rem)]">
        <CustomCard 
          icon="📊"
          number={data.length}
          label="Total Sessions"
        />
      </div>
      <div className="flex-1 min-w-[250px] basis-[calc(33.333%-1rem)]">
        <CustomCard 
          icon="⏱️"
          number="24.5"
          label="Total Hours"
        />
      </div>
      <div className="flex-1 min-w-[250px] basis-[calc(33.333%-1rem)]">
        <CustomCard 
          icon="🔥"
          number="7"
          label="Streak Days"
        />
      </div>
      <div className="flex-1 min-w-[250px] basis-[calc(33.333%-1rem)]">
        <CustomCard 
          icon="📅"
          number="15"
          label="Active Days"
        />
      </div>
      <div className="flex-1 min-w-[250px] basis-[calc(33.333%-1rem)]">
        <CustomCard 
          icon="⭐"
          number="3.5"
          label="Avg Hours/Day"
        />
      </div>
    </div>
  );
};