#!/usr/bin/env python3
import sys

def calculate_tds(annual_income):
    """
    Calculate TDS based on Indian Income Tax Slabs (Old Regime)
    Slabs for FY 2023-24:
    - Up to 2,50,000: Nil
    - 2,50,001 to 5,00,000: 5%
    - 5,00,001 to 10,00,000: 20%
    - Above 10,00,000: 30%
    """
    
    tax = 0
    
    if annual_income <= 250000:
        tax = 0
    elif annual_income <= 500000:
        tax = (annual_income - 250000) * 0.05
    elif annual_income <= 1000000:
        tax = (250000 * 0.05) + ((annual_income - 500000) * 0.20)
    else:
        tax = (250000 * 0.05) + (500000 * 0.20) + ((annual_income - 1000000) * 0.30)
    
    # Add 4% Health and Education Cess
    cess = tax * 0.04
    total_tax = tax + cess
    
    return total_tax

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("0")
        sys.exit(0)
    
    try:
        annual_income = float(sys.argv[1])
        tds = calculate_tds(annual_income)
        print(f"{tds:.2f}")
    except Exception as e:
        print("0")
        sys.exit(1)