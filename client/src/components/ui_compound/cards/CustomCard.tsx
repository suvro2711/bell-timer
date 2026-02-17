import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import React from "react";

interface CustomCardProps {
  icon: React.ReactNode;
  number: string | number;
  label: string;
}

export function CustomCard({ icon, number, label }: CustomCardProps) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
        <Box>
          <Box sx={{ fontSize: '3rem', p: 1, mt: 2 }}>
            {icon}
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" sx={{mr: 5}}>
          {number}
        </Typography>
      </CardContent>
    </Card>
  );
}
